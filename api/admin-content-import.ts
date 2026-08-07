import { supabaseRequest, SupabaseRequestError } from "./_supabase.js";
import { generateOpenAIText, getAIDiagnostic, parseJsonResponse, OpenAIDiagnosticError } from "./_openai.js";

/**
 * Content-import pipeline for the shared learning_content catalog, modeled
 * after Terravox's own /api/admin/questions/import/opentdb: fetch from an
 * external source, enrich/translate with AI, and land everything as an
 * unpublished draft. Nothing here ever becomes visible to a student — a
 * human has to approve (admin-content-review) and then publish
 * (admin-content-publish) before a word reaches a mission.
 *
 * Sources:
 * - Datamuse (https://api.datamuse.com): free, no key, used to discover
 *   words related to a theme ("ml" = "means like").
 * - dictionaryapi.dev: free, no key, best-effort English example sentence
 *   per word (not every word has one — that's fine, OpenAI fills the gap).
 * - OpenAI: translates to pt-BR, writes/polishes the example sentence pair,
 *   and confirms the final CEFR level.
 */

const CEFR_LEVELS = new Set(["pre_a1", "a1", "a2", "b1"]);

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

type DatamuseWord = { word: string; score?: number };

async function fetchThemeWords(theme: string, limit: number): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(theme)}&max=${Math.min(limit * 5, 100)}`);
  } catch {
    throw new Error("Não foi possível consultar a Datamuse (fonte de palavras por tema).");
  }
  if (!response.ok) throw new Error(`A Datamuse respondeu com o status ${response.status}.`);
  const data = (await response.json().catch(() => null)) as DatamuseWord[] | null;
  if (!Array.isArray(data)) throw new Error("A Datamuse devolveu um formato inesperado.");
  return data
    .map((item) => (typeof item?.word === "string" ? item.word.trim().toLowerCase() : ""))
    // Keep single words and short two-word phrases only; skip anything with
    // punctuation, numbers or more than two words.
    .filter((word) => /^[a-z]+(?: [a-z]+)?$/.test(word));
}

// Best-effort: dictionaryapi.dev does not cover every word, and its shape
// isn't network-tested from this environment (outbound access to arbitrary
// hosts is blocked in this sandbox) — any mismatch just yields null instead
// of throwing, and OpenAI writes the example sentence from scratch instead.
async function fetchExampleSentence(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data)) return null;
    for (const entry of data) {
      for (const meaning of entry?.meanings ?? []) {
        for (const definition of meaning?.definitions ?? []) {
          if (typeof definition?.example === "string" && definition.example.trim()) return definition.example.trim();
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

const importJsonSchema = {
  type: "json_schema", name: "eduquest_content_import", strict: true,
  schema: {
    type: "object", additionalProperties: false, required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["term_en", "translation_pt", "example_en", "example_pt", "cefr_level"],
          properties: {
            term_en: { type: "string" },
            translation_pt: { type: "string" },
            example_en: { type: "string" },
            example_pt: { type: "string" },
            cefr_level: { type: "string", enum: ["pre_a1", "a1", "a2", "b1"] },
          },
        },
      },
    },
  },
} as const;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const { theme, targetLevel, amount = 5 } = req.body || {};
  if (typeof theme !== "string" || !theme.trim()) return res.status(400).json({ error: "Informe um tema em inglês, ex: 'animals', 'school', 'food'." });
  if (typeof targetLevel !== "string" || !CEFR_LEVELS.has(targetLevel)) return res.status(400).json({ error: "Nível inválido. Use pre_a1, a1, a2 ou b1." });
  const requestedAmount = Math.min(Math.max(Number(amount) || 5, 1), 15);
  const cleanTheme = theme.trim().toLowerCase();

  try {
    const candidates = await fetchThemeWords(cleanTheme, requestedAmount);
    if (!candidates.length) return res.status(422).json({ error: "A Datamuse não retornou nenhuma palavra para esse tema. Tente um termo mais comum em inglês." });

    // Slugs are deterministic and globally unique in learning_content, so we
    // check against the real column instead of scoping by theme — the same
    // word could already exist from a previous run under a different theme.
    const candidateSlugs = Array.from(new Set(candidates)).map((word) => ({ word, slug: `${targetLevel}-${slugify(word)}` }));
    const existingResponse = await supabaseRequest(`learning_content?select=slug&slug=in.(${candidateSlugs.map((c) => c.slug).join(",")})`);
    const existingSlugs = new Set(((await existingResponse.json()) as { slug: string }[]).map((row) => row.slug));
    const newCandidates = candidateSlugs.filter((c) => !existingSlugs.has(c.slug)).slice(0, requestedAmount);
    if (!newCandidates.length) return res.status(422).json({ error: "Todas as palavras que a Datamuse sugeriu para esse tema/nível já estão no catálogo. Tente outro tema." });

    const examples = await Promise.all(newCandidates.map((c) => fetchExampleSentence(c.word)));
    const wordList = newCandidates
      .map((c, index) => `- ${c.word}${examples[index] ? ` (exemplo em inglês encontrado: "${examples[index]}")` : ""}`)
      .join("\n");

    const instructions = `Você é o Professor EduQuest, curador do catálogo pedagógico de inglês para crianças e pré-adolescentes/adolescentes (nível CEFR alvo: ${targetLevel}). Para cada palavra da lista recebida, gere: a tradução em português do Brasil, uma frase de exemplo curta e apropriada para o público infantojuvenil (aproveite o exemplo em inglês sugerido se for adequado ao nível ${targetLevel}, senão crie um mais simples e seguro), a tradução dessa frase, e confirme ou ajuste o nível CEFR real da palavra (pre_a1, a1, a2 ou b1). Nunca inclua conteúdo impróprio, violento, adulto ou assustador. Devolva exatamente as ${newCandidates.length} palavras recebidas, na mesma ordem, sem pular nenhuma.`;
    const text = await generateOpenAIText({ instructions, input: `Tema: ${cleanTheme}\nPalavras:\n${wordList}`, temperature: 0.3, textFormat: importJsonSchema });
    const parsed = parseJsonResponse(text) as { items?: any[] };
    if (!Array.isArray(parsed?.items) || !parsed.items.length) throw new Error("A IA não devolveu nenhum item aproveitável para este tema.");

    const rows = parsed.items
      .filter((item) => typeof item?.term_en === "string" && item.term_en.trim() && typeof item?.translation_pt === "string" && item.translation_pt.trim())
      .map((item) => ({
        slug: `${targetLevel}-${slugify(String(item.term_en))}`,
        language_code: "en",
        content_kind: "vocabulary",
        cefr_level: CEFR_LEVELS.has(item.cefr_level) ? item.cefr_level : targetLevel,
        theme: cleanTheme,
        term_en: String(item.term_en).trim(),
        translation_pt: String(item.translation_pt).trim(),
        example_en: String(item.example_en || "").trim() || null,
        example_pt: String(item.example_pt || "").trim() || null,
        source_name: "datamuse+dictionaryapi.dev+openai",
        source_url: "https://api.datamuse.com/ ; https://dictionaryapi.dev/",
        license_note: "Palavra descoberta via Datamuse (API pública gratuita); frase de exemplo via dictionaryapi.dev (dados do Wiktionary, CC BY-SA) quando disponível; tradução e revisão de adequação via OpenAI. Requer aprovação humana antes de publicar.",
        status: "draft",
      }));
    if (!rows.length) return res.status(422).json({ error: "Nenhum item retornado pela IA passou na validação mínima (term_en/translation_pt)." });

    const insertResponse = await supabaseRequest("learning_content", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(rows),
    });
    const inserted = await insertResponse.json();
    return res.status(201).json({ imported: Array.isArray(inserted) ? inserted.length : 0, items: inserted });
  } catch (error) {
    if (error instanceof SupabaseRequestError) return res.status(error.status).json({ error: error.message });
    if (error instanceof OpenAIDiagnosticError) {
      const diagnostic = getAIDiagnostic(error);
      return res.status(error.status).json({ error: diagnostic.message, diagnostic });
    }
    console.error("Content import error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Falha desconhecida na importação de conteúdo." });
  }
}
