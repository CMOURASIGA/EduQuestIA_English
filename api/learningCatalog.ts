type CatalogRow = Record<string, unknown>;

export type CatalogWord = {
  id: string;
  word: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  category: string;
  level: string;
};

export class LearningCatalogError extends Error {
  constructor(message: string, public readonly status = 503) {
    super(message);
    this.name = "LearningCatalogError";
  }
}

function catalogLevelFor(userLevel: number) {
  if (userLevel <= 2) return "pre_a1";
  if (userLevel <= 6) return "a1";
  return "a2";
}

function value(row: CatalogRow, ...keys: string[]) {
  for (const key of keys) {
    const candidate = row[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function asCatalogWord(row: CatalogRow): CatalogWord | null {
  const word = value(row, "word", "term", "title", "content");
  const translation = value(row, "translation", "translation_pt_br", "meaning", "meaning_pt_br");
  if (!word || !translation) return null;
  return {
    id: value(row, "id") || `catalog-${word.toLowerCase().replace(/\W+/g, "-")}`,
    word,
    translation,
    example: value(row, "example", "example_sentence", "sentence") || `I can use ${word}.`,
    exampleTranslation: value(row, "example_translation", "example_translation_pt_br", "sentence_translation") || `Eu posso usar ${translation}.`,
    category: value(row, "category", "theme", "topic") || "vocabulário",
    level: value(row, "level", "cefr_level", "pedagogical_level") || "pre_a1",
  };
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new LearningCatalogError("O catálogo pedagógico ainda não está configurado no Vercel. Cadastre SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente de Preview.");

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new LearningCatalogError("Não foi possível alcançar o catálogo pedagógico no Supabase.");
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase learning catalog error:", response.status, detail);
    throw new LearningCatalogError(response.status === 401 || response.status === 403
      ? "O Vercel não tem permissão para consultar o catálogo pedagógico."
      : "O catálogo pedagógico está indisponível no Supabase.", response.status);
  }
  return response;
}

export async function getCatalogWords(params: { userLevel: number; knownWords: string[]; amount?: number }) {
  const desiredLevel = catalogLevelFor(params.userLevel);
  const response = await supabaseRequest("learning_content?select=*&is_active=eq.true&order=created_at.asc&limit=100");
  const rows = await response.json() as CatalogRow[];
  const known = new Set(params.knownWords.map((word) => word.trim().toLowerCase()));
  const words = rows.map(asCatalogWord).filter((word): word is CatalogWord => Boolean(word));
  const exactLevel = words.filter((word) => word.level.toLowerCase() === desiredLevel && !known.has(word.word.toLowerCase()));
  const progressive = words.filter((word) => !known.has(word.word.toLowerCase()));
  const selected = (exactLevel.length >= 3 ? exactLevel : progressive).slice(0, params.amount ?? 5);
  if (selected.length < 3) throw new LearningCatalogError("O catálogo não possui pelo menos três palavras novas para esta missão. Faça uma carga adicional de conteúdo antes de continuar.", 422);
  return { words: selected, level: desiredLevel };
}

export async function recordCatalogProgress(params: { learnerId: string; contentIds: string[]; lessonId: string; outcome: "completed" | "practiced" }) {
  if (!params.contentIds.length) return;
  const payload = params.contentIds.map((contentId) => ({
    learner_id: params.learnerId,
    learning_content_id: contentId,
    lesson_id: params.lessonId,
    outcome: params.outcome,
    completed_at: new Date().toISOString(),
  }));
  await supabaseRequest("learner_content_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}
