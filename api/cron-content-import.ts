import { SupabaseRequestError } from "./_supabase.js";
import { getAIDiagnostic, OpenAIDiagnosticError } from "./_openai.js";
import { runContentImport, ContentImportError } from "./_contentImportCore.js";

/**
 * Fired daily by Vercel Cron (see vercel.json). Vercel automatically signs
 * the request with `Authorization: Bearer <CRON_SECRET>` when that env var
 * is configured — verified below so nobody else can trigger this by
 * guessing the path.
 *
 * Same safety property as the manual admin endpoint: this only ever inserts
 * drafts. A human still has to review (admin-content-review) and publish
 * (admin-content-publish) before anything reaches a mission — this just
 * removes the "someone has to remember to run the import" chore.
 */

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
  return Boolean(secret && req.header("authorization") === `Bearer ${secret}`);
}

function pickTodayEntry(): { theme: string; targetLevel: string } {
  const now = new Date();
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000);
  return THEME_ROTATION[dayOfYear % THEME_ROTATION.length];
}

export default async function handler(req: any, res: any) {
  if (!isCronRequest(req)) return res.status(401).json({ error: "Acesso restrito ao cron da Vercel." });

  const { theme, targetLevel } = pickTodayEntry();
  try {
    const result = await runContentImport({ theme, targetLevel, amount: 5 });
    console.log(`[cron-content-import] Importadas ${result.imported} palavra(s) de '${theme}' (${targetLevel}).`);
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
