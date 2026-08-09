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

// Product identity inside the shared Supabase catalog (`learning_content`,
// `product_content_publications`, `learner_content_history`). The same base
// is shared with other products (e.g. Terravox) via `product_code`, so every
// query here must stay scoped to "eduquest" and must never assume it is the
// only consumer of the tables.
const PRODUCT_CODE = "eduquest";

// Mirrors the CEFR progression narrated in src/utils/levels.ts (getLevelPerk),
// so the words handed to a mission keep getting harder as the student levels
// up instead of freezing at "a2" forever past level 6. If the catalog has no
// content yet at the desired tier, getCatalogWords already falls back to the
// closest available words — this only stops being a no-op once b1+ content
// is loaded (see the content-volume item on the roadmap).
function catalogLevelFor(userLevel: number) {
  if (userLevel <= 2) return "pre_a1";
  if (userLevel <= 6) return "a1";
  if (userLevel <= 14) return "a2";
  return "b1";
}

function value(row: CatalogRow, ...keys: string[]) {
  for (const key of keys) {
    const candidate = row[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

// Field names below match the real `learning_content` columns (term_en,
// translation_pt, example_en, example_pt, theme, cefr_level) instead of the
// generic aliases used previously, which never matched the actual schema.
function asCatalogWord(row: CatalogRow): CatalogWord | null {
  const word = value(row, "term_en");
  const translation = value(row, "translation_pt");
  if (!word || !translation) return null;
  return {
    id: value(row, "id") || `catalog-${word.toLowerCase().replace(/\W+/g, "-")}`,
    word,
    translation,
    example: value(row, "example_en") || `I can use ${word}.`,
    exampleTranslation: value(row, "example_pt") || `Eu posso usar ${translation}.`,
    category: value(row, "theme") || "vocabulário",
    level: value(row, "cefr_level") || "pre_a1",
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

// `learning_content` has no `is_active` column — publication per product is
// tracked in `product_content_publications`. We resolve the ids published
// for EduQuest first, then read the content itself.
async function getPublishedContentIds(): Promise<string[]> {
  const response = await supabaseRequest(
    `product_content_publications?select=content_id&product_code=eq.${PRODUCT_CODE}&is_active=eq.true&limit=200`
  );
  const rows = (await response.json()) as CatalogRow[];
  return rows.map((row) => value(row, "content_id")).filter(Boolean);
}

export async function getCatalogWords(params: { userLevel: number; knownWords: string[]; amount?: number }) {
  const desiredLevel = catalogLevelFor(params.userLevel);
  const contentIds = await getPublishedContentIds();
  if (!contentIds.length) throw new LearningCatalogError("Nenhum conteúdo do catálogo está publicado para o EduQuest no momento.", 422);

  const idsFilter = contentIds.join(",");
  const response = await supabaseRequest(
    `learning_content?select=*&status=eq.approved&id=in.(${idsFilter})&order=created_at.asc&limit=100`
  );
  const rows = (await response.json()) as CatalogRow[];
  const known = new Set(params.knownWords.map((word) => word.trim().toLowerCase()));
  const words = rows.map(asCatalogWord).filter((word): word is CatalogWord => Boolean(word));
  const exactLevel = words.filter((word) => word.level.toLowerCase() === desiredLevel && !known.has(word.word.toLowerCase()));
  const progressive = words.filter((word) => !known.has(word.word.toLowerCase()));
  const selected = (exactLevel.length >= 3 ? exactLevel : progressive).slice(0, params.amount ?? 5);
  if (selected.length < 3) throw new LearningCatalogError("O catálogo não possui pelo menos três palavras novas para esta missão. Faça uma carga adicional de conteúdo antes de continuar.", 422);
  return { words: selected, level: desiredLevel };
}

// `learner_content_history` has no unique constraint on
// (product_code, learner_external_id, content_id), so we read the existing
// row first and decide between PATCH (accumulate exposure) and POST (first
// time this learner sees this content) instead of relying on a DB upsert.
export async function recordCatalogProgress(params: { learnerId: string; contentIds: string[] }) {
  const contentIds = Array.from(new Set(params.contentIds.filter(Boolean)));
  if (!contentIds.length) return;

  const existingResponse = await supabaseRequest(
    `learner_content_history?select=id,content_id,exposure_count,correct_count&product_code=eq.${PRODUCT_CODE}&learner_external_id=eq.${encodeURIComponent(params.learnerId)}&content_id=in.(${contentIds.join(",")})`
  );
  const existingRows = (await existingResponse.json()) as CatalogRow[];
  const existingByContentId = new Map(existingRows.map((row) => [String(row.content_id), row]));

  const nowIso = new Date().toISOString();
  const requests: Promise<Response>[] = [];
  const toInsert: CatalogRow[] = [];

  for (const contentId of contentIds) {
    const existing = existingByContentId.get(contentId);
    if (existing) {
      const exposureCount = Number(existing.exposure_count ?? 0) + 1;
      const correctCount = Number(existing.correct_count ?? 0) + 1;
      requests.push(
        supabaseRequest(`learner_content_history?id=eq.${existing.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            exposure_count: exposureCount,
            correct_count: correctCount,
            mastery_status: exposureCount >= 3 ? "review" : "learning",
            last_seen_at: nowIso,
          }),
        })
      );
    } else {
      toInsert.push({
        product_code: PRODUCT_CODE,
        learner_external_id: params.learnerId,
        content_id: contentId,
        exposure_count: 1,
        correct_count: 1,
        incorrect_count: 0,
        mastery_status: "learning",
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      });
    }
  }

  if (toInsert.length) {
    requests.push(
      supabaseRequest("learner_content_history", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(toInsert),
      })
    );
  }

  await Promise.all(requests);
}
