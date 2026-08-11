import { SupabaseRequestError } from "./_supabase.js";
import { getAIDiagnostic, OpenAIDiagnosticError } from "./_openai.js";
import { runContentImport, getPublishedLevelCounts, ContentImportError } from "./_contentImportCore.js";

/**
 * Fired daily by Vercel Cron (see vercel.json). Vercel automatically signs
 * the request with `Authorization: Bearer <CRON_SECRET>` when that env var
 * is configured — verified below so nobody else can trigger this by
 * guessing the path.
 *
 * Unlike the manual admin endpoint (always drafts), this cron runs with
 * autoApprove: true — runContentImport applies an automated quality gate
 * (see passesAutoQualityGate in _contentImportCore.ts) and only items that
 * pass it get published straight to the catalog, no human involved.
 * Anything that doesn't pass still lands as a normal "draft" for the admin
 * dashboard, same as before. This mirrors the dynamic/autonomous refill
 * built for Terravox's question bank, adapted for the fact that this
 * content has no external source grounding it (Terravox translates
 * community-curated trivia; this is 100% AI-authored vocabulary) — hence
 * the extra automated gate instead of a blanket auto-approve.
 *
 * Level targeting is stock-aware, not just a blind calendar rotation:
 * whichever CEFR level has the fewest published words gets today's import
 * (this is what actually closes gaps like the thin b1 catalog mentioned in
 * _learningCatalog.ts). Only once every level clears the floor does it
 * fall back to the theme rotation below for steady, varied growth.
 */
const MIN_PUBLISHED_PER_LEVEL = 20;

// Cycle deterministically through themes and levels so every run makes
// forward progress on the catalog without needing any manual input. Order
// goes roughly easiest-to-hardest; each entry repeats once the list wraps.
const THEME_ROTATION: { theme: string; targetLevel: string }[] = [
  { theme: "animals", targetLevel: "pre_a1" },
  { theme: "food", targetLevel: "pre_a1" },
  { theme: "family", targetLevel: "pre_a1" },
  { theme: "colors", targetLevel: "pre_a1" },
  { theme: "school", targetLevel: "a1" },
  { theme: "body", targetLevel: "a1" },
  { theme: "clothes", targetLevel: "a1" },
  { theme: "weather", targetLevel: "a1" },
  { theme: "numbers", targetLevel: "a1" },
  { theme: "house", targetLevel: "a1" },
  { theme: "sports", targetLevel: "a2" },
  { theme: "feelings", targetLevel: "a2" },
  { theme: "hobbies", targetLevel: "a2" },
  { theme: "transportation", targetLevel: "a2" },
  { theme: "jobs", targetLevel: "a2" },
  { theme: "nature", targetLevel: "a2" },
  { theme: "technology", targetLevel: "b1" },
  { theme: "travel", targetLevel: "b1" },
  { theme: "music", targetLevel: "b1" },
  { theme: "time", targetLevel: "b1" },
];

function isCronRequest(req: any): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers["authorization"] === `Bearer ${secret}`);
}

function dayOfYear(): number {
  const now = new Date();
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000);
}

function pickEntryForLevel(targetLevel: string): { theme: string; targetLevel: string } {
  const themesForLevel = THEME_ROTATION.filter((entry) => entry.targetLevel === targetLevel);
  return themesForLevel[dayOfYear() % themesForLevel.length];
}

// Levels a b1 antes dos demais: é o nível mais raso hoje (ver o comentário
// de roadmap em _learningCatalog.ts), então quando mais de um nível está
// abaixo do piso, prioriza fechar esse gap primeiro.
const LEVEL_PRIORITY = ["b1", "a2", "a1", "pre_a1"];

async function pickTodayEntry(): Promise<{ theme: string; targetLevel: string }> {
  try {
    const counts = await getPublishedLevelCounts();
    const thin = LEVEL_PRIORITY.find((level) => (counts[level] ?? 0) < MIN_PUBLISHED_PER_LEVEL);
    if (thin) return pickEntryForLevel(thin);
  } catch (error) {
    // Se a checagem de estoque falhar por qualquer motivo, não trava o
    // cron inteiro — só cai pro rodízio de sempre.
    console.warn("[cron-content-import] Não foi possível checar o estoque por nível, usando rodízio padrão:", error instanceof Error ? error.message : error);
  }
  return THEME_ROTATION[dayOfYear() % THEME_ROTATION.length];
}

export default async function handler(req: any, res: any) {
  if (!isCronRequest(req)) return res.status(401).json({ error: "Acesso restrito ao cron da Vercel." });

  const { theme, targetLevel } = await pickTodayEntry();
  try {
    const result = await runContentImport({ theme, targetLevel, amount: 5, autoApprove: true });
    console.log(`[cron-content-import] Importadas ${result.imported} palavra(s) de '${theme}' (${targetLevel}), ${result.autoApproved} aprovada(s) e publicada(s) automaticamente.`);
    return res.status(200).json({ theme, targetLevel, ...result });
  } catch (error) {
    // "Nothing new for this theme/level today" is an expected outcome as the
    // catalog fills up, not a failure worth flagging in Vercel's cron
    // monitoring — everything else still surfaces as a real error status.
    if (error instanceof ContentImportError) {
      console.warn(`[cron-content-import] Pulado (${theme}/${targetLevel}): ${error.message}`);
      return res.status(200).json({ theme, targetLevel, imported: 0, skipped: error.message });
    }
    if (error instanceof SupabaseRequestError) {
      console.error("[cron-content-import] Supabase:", error.message);
      return res.status(error.status).json({ theme, targetLevel, error: error.message });
    }
    if (error instanceof OpenAIDiagnosticError) {
      const diagnostic = getAIDiagnostic(error);
      console.error("[cron-content-import] OpenAI:", diagnostic);
      return res.status(error.status).json({ theme, targetLevel, error: diagnostic.message, diagnostic });
    }
    console.error("[cron-content-import] Erro inesperado:", error);
    return res.status(500).json({ theme, targetLevel, error: error instanceof Error ? error.message : "Falha desconhecida." });
  }
}
