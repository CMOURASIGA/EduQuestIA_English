import { supabaseRequest, SupabaseRequestError } from "./_supabase.js";

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

// A human decides between these three outcomes for a draft. "draft" itself
// is not allowed here — content only moves forward or gets archived, it
// never gets reset back to draft through this endpoint.
const ALLOWED_STATUS = new Set(["review", "approved", "archived"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const { id, status } = req.body || {};
  if (typeof id !== "string" || !id.trim()) return res.status(400).json({ error: "Informe o id do conteúdo." });
  if (typeof status !== "string" || !ALLOWED_STATUS.has(status)) return res.status(400).json({ error: "Status inválido. Use review, approved ou archived." });

  try {
    const response = await supabaseRequest(`learning_content?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    });
    const updated = await response.json();
    if (!Array.isArray(updated) || !updated.length) return res.status(404).json({ error: "Conteúdo não encontrado." });
    return res.status(200).json({ item: updated[0] });
  } catch (error) {
    if (error instanceof SupabaseRequestError) return res.status(error.status).json({ error: error.message });
    console.error("Content review error:", error);
    return res.status(500).json({ error: "Não foi possível atualizar o conteúdo." });
  }
}
