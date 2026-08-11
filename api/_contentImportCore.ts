import { supabaseRequest } from "./_supabase.js";
import { generateOpenAIText, parseJsonResponse } from "./_openai.js";

/**
 * Core discover -> enrich -> translate -> draft pipeline for the shared
 * learning_content catalog, shared by the manual admin endpoint
 * (api/admin-content-import.ts) and the daily cron job
 * (api/cron-content-import.ts). This function only ever inserts rows as
 * status: 'draft' — it never approves or publishes anything. A human still
 * has to review a draft (admin-content-review.ts) before it can be
 * published (admin-content-publish.ts) and reach a mission.
 *
 * Sources:
 * - Datamuse (https://api.datamuse.com): free, no key, discovers words
 *   related to a theme ("ml" = "means like").
 * - dictionaryapi.dev: free, no key, best-effort English example sentence
 *   per word (not every word has one — OpenAI fills the gap when missing).
 * - OpenAI: translates to pt-BR, writes/polishes the example sentence
 *   pair, and confirms the final CEFR level.
 */

export class ContentImportError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = "ContentImportError";
  }
}

export const CEFR_LEVELS = new Set(["pre_a1", "a1", "a2", "b1"]);
const PRODUCT_CODE = "eduquest";

// Rede de segurança independente do prompt: mesmo pedindo pra IA nunca
// gerar conteúdo impróprio, um item que citar qualquer um desses termos
// (em inglês ou português, na palavra ou nos exemplos) nunca é
// auto-aprovado — cai como rascunho normal para revisão humana, como
// sempre foi. Não é uma lista exaustiva de moderação, é só a segunda
// camada antes de publicar algo sem olhos humanos.
const UNSAFE_TERMS = [
  "sex", "sexo", "porn", "pornô", "nude", "nu ", "kill", "matar", "suicide", "suicídio",
  "drug", "droga", "cocaine", "cocaína", "weapon", "arma", "gun", "blood", "sangue",
  "hate", "ódio", "racis", "nazi", "damn", "merda", "porra", "fuck", "puta",
];

function containsUnsafeTerm(...texts: (string | null | undefined)[]): boolean {
  const combined = texts.filter(Boolean).join(" ").toLowerCase();
  return UNSAFE_TERMS.some((term) => combined.includes(term));
}

/**
 * Heurísticas leves que decidem se um item gerado 100% pela IA (não há
 * fonte externa validando, diferente do banco de trivia do Terravox) pode
 * ser publicado sozinho ou precisa de revisão humana. Passar aqui não é
 * garantia de qualidade pedagógica — é só a rede mínima contra os erros
 * mais óbvios (tradução vazia/igual à palavra, frase de exemplo que nem
 * cita a palavra, conteúdo sensível).
 */
function passesAutoQualityGate(row: { term_en: string; translation_pt: string; example_en: string | null; example_pt: string | null; cefr_level: string }): boolean {
  const term = row.term_en.trim().toLowerCase();
  const translation = row.translation_pt.trim().toLowerCase();
  if (!term || !translation || term === translation) return false;
  if (term.length > 40 || translation.length > 60) return false;
  if (!row.example_en?.trim() || !row.example_pt?.trim()) return false;
  if (!row.example_en.toLowerCase().includes(term.split(" ")[0])) return false;
  if (containsUnsafeTerm(row.term_en, row.translation_pt, row.example_en, row.example_pt)) return false;
  return true;
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
    throw new ContentImportError("Não foi possível consultar a Datamuse (fonte de palavras por tema).", 502);
  }
  if (!response.ok) throw new ContentImportError(`A Datamuse respondeu com o status ${response.status}.`, 502);
  const data = (await response.json().catch(() => null)) as DatamuseWord[] | null;
  if (!Array.isArray(data)) throw new ContentImportError("A Datamuse devolveu um formato inesperado.", 502);
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

export async function runContentImport(params: { theme: string; targetLevel: string; amount: number; autoApprove?: boolean }): Promise<{ imported: number; autoApproved: number; items: any[] }> {
  const { theme, targetLevel, amount, autoApprove = false } = params;
  const candidates = await fetchThemeWords(theme, amount);
  if (!candidates.length) throw new ContentImportError("A Datamuse não retornou nenhuma palavra para esse tema. Tente um termo mais comum em inglês.");

  // Slugs are deterministic and globally unique in learning_content, so we
  // check against the real column instead of scoping by theme — the same
  // word could already exist from a previous run under a different theme.
  const candidateSlugs = Array.from(new Set(candidates)).map((word) => ({ word, slug: `${targetLevel}-${slugify(word)}` }));
  const existingResponse = await supabaseRequest(`learning_content?select=slug&slug=in.(${candidateSlugs.map((c) => c.slug).join(",")})`);
  const existingSlugs = new Set(((await existingResponse.json()) as { slug: string }[]).map((row) => row.slug));
  const newCandidates = candidateSlugs.filter((c) => !existingSlugs.has(c.slug)).slice(0, amount);
  if (!newCandidates.length) throw new ContentImportError("Todas as palavras que a Datamuse sugeriu para esse tema/nível já estão no catálogo.");

  const examples = await Promise.all(newCandidates.map((c) => fetchExampleSentence(c.word)));
  const wordList = newCandidates
    .map((c, index) => `- ${c.word}${examples[index] ? ` (exemplo em inglês encontrado: "${examples[index]}")` : ""}`)
    .join("\n");

  const instructions = `Você é o Professor EduQuest, curador do catálogo pedagógico de inglês para crianças e pré-adolescentes/adolescentes (nível CEFR alvo: ${targetLevel}). Para cada palavra da lista recebida, gere: a tradução em português do Brasil, uma frase de exemplo curta e apropriada para o público infantojuvenil (aproveite o exemplo em inglês sugerido se for adequado ao nível ${targetLevel}, senão crie um mais simples e seguro), a tradução dessa frase, e confirme ou ajuste o nível CEFR real da palavra (pre_a1, a1, a2 ou b1). Nunca inclua conteúdo impróprio, violento, adulto ou assustador. Devolva exatamente as ${newCandidates.length} palavras recebidas, na mesma ordem, sem pular nenhuma.`;
  const text = await generateOpenAIText({ instructions, input: `Tema: ${theme}\nPalavras:\n${wordList}`, temperature: 0.3, textFormat: importJsonSchema });
  const parsed = parseJsonResponse(text) as { items?: any[] };
  if (!Array.isArray(parsed?.items) || !parsed.items.length) throw new ContentImportError("A IA não devolveu nenhum item aproveitável para este tema.", 502);

  const rows = parsed.items
    .filter((item) => typeof item?.term_en === "string" && item.term_en.trim() && typeof item?.translation_pt === "string" && item.translation_pt.trim())
    .map((item) => {
      const cefr_level = CEFR_LEVELS.has(item.cefr_level) ? item.cefr_level : targetLevel;
      const term_en = String(item.term_en).trim();
      const translation_pt = String(item.translation_pt).trim();
      const example_en = String(item.example_en || "").trim() || null;
      const example_pt = String(item.example_pt || "").trim() || null;
      // Só passa pro auto-aprovado quando o chamador pediu (cron) E o item
      // sobrevive à rede de segurança mínima — qualquer outra combinação
      // cai como "draft" de sempre, esperando revisão humana.
      const autoApproved = autoApprove && passesAutoQualityGate({ term_en, translation_pt, example_en, example_pt, cefr_level });
      return {
        slug: `${targetLevel}-${slugify(term_en)}`,
        language_code: "en",
        content_kind: "vocabulary",
        cefr_level,
        theme,
        term_en,
        translation_pt,
        example_en,
        example_pt,
        source_name: "datamuse+dictionaryapi.dev+openai",
        source_url: "https://api.datamuse.com/ ; https://dictionaryapi.dev/",
        license_note: autoApproved
          ? "Palavra descoberta via Datamuse (API pública gratuita); frase de exemplo via dictionaryapi.dev (dados do Wiktionary, CC BY-SA) quando disponível; tradução e revisão de adequação via OpenAI. Aprovado automaticamente pelo cron após passar no filtro de qualidade — sem revisão humana."
          : "Palavra descoberta via Datamuse (API pública gratuita); frase de exemplo via dictionaryapi.dev (dados do Wiktionary, CC BY-SA) quando disponível; tradução e revisão de adequação via OpenAI. Requer aprovação humana antes de publicar.",
        status: autoApproved ? "approved" : "draft",
        _autoApproved: autoApproved,
      };
    });
  if (!rows.length) throw new ContentImportError("Nenhum item retornado pela IA passou na validação mínima (term_en/translation_pt).", 502);

  const insertResponse = await supabaseRequest("learning_content", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows.map(({ _autoApproved, ...row }) => row)),
  });
  const inserted = (await insertResponse.json()) as { id: string; slug: string }[];

  // rows e inserted mantêm a mesma ordem (Postgres preserva a ordem de
  // inserção do array no retorno de um POST em lote), então dá pra casar
  // pelo índice sem precisar re-consultar por slug.
  const autoApprovedIds = inserted.filter((_, index) => rows[index]?._autoApproved).map((row) => row.id);
  if (autoApprovedIds.length) {
    await supabaseRequest("product_content_publications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(autoApprovedIds.map((contentId) => ({
        content_id: contentId,
        product_code: PRODUCT_CODE,
        is_active: true,
        configuration: { eligible_for_auto_mission: true },
      }))),
    });
  }

  return { imported: inserted.length, autoApproved: autoApprovedIds.length, items: inserted };
}

/**
 * Quantas palavras já publicadas (aprovadas + ativas pro EduQuest) existem
 * por nível CEFR — usado pelo cron para decidir qual nível está mais raso
 * e merece a importação do dia, em vez de só girar por um calendário fixo.
 * PostgREST não faz join+group-by num único request, então busca os ids
 * publicados e conta os níveis em memória (volume baixo o bastante pra
 * isso ser barato).
 */
export async function getPublishedLevelCounts(): Promise<Record<string, number>> {
  const pubResponse = await supabaseRequest(`product_content_publications?select=content_id&product_code=eq.${PRODUCT_CODE}&is_active=eq.true&limit=1000`);
  const pubRows = (await pubResponse.json()) as { content_id: string }[];
  if (!pubRows.length) return {};
  const contentResponse = await supabaseRequest(`learning_content?select=cefr_level&id=in.(${pubRows.map((row) => row.content_id).join(",")})`);
  const contentRows = (await contentResponse.json()) as { cefr_level: string }[];
  const counts: Record<string, number> = {};
  for (const row of contentRows) counts[row.cefr_level] = (counts[row.cefr_level] ?? 0) + 1;
  return counts;
}
