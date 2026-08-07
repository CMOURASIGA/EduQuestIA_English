import { recordCatalogProgress, LearningCatalogError } from "./learningCatalog.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const { learnerId, contentIds } = req.body || {};
  if (typeof learnerId !== "string" || !learnerId.trim() || !Array.isArray(contentIds)) {
    return res.status(400).json({ error: "Dados de progresso inválidos." });
  }
  try {
    await recordCatalogProgress({ learnerId, contentIds: contentIds.filter((id): id is string => typeof id === "string") });
    return res.status(204).end();
  } catch (error) {
    const message = error instanceof LearningCatalogError ? error.message : "Não foi possível registrar o progresso no catálogo.";
    console.error("Learning progress error:", error);
    return res.status(error instanceof LearningCatalogError ? error.status : 500).json({ error: message });
  }
}
