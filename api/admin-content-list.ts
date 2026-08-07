import { supabaseRequest, SupabaseRequestError } from "./_supabase.js";

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

const ALLOWED_STATUS = new Set(["draft", "review", "approved", "archived"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const statusParam = typeof req.query?.status === "string" ? req.query.status : "draft";
  const status = ALLOWED_STATUS.has(statusParam) ? statusParam : "draft";

  try {
    const response = await supabaseRequest(`learning_content?select=*&status=eq.${status}&order=created_at.desc&limit=100`);
    const items = await response.json();
    return res.status(200).json({ items });
  } catch (error) {
    if (error instanceof SupabaseRequestError) return res.status(error.status).json({ error: error.message });
    console.error("Content list error:", error);
    return res.status(500).json({ error: "Não foi possível listar o conteúdo." });
  }
}
