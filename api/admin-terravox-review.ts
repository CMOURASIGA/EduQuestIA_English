/**
 * Server-to-server proxy into Terravox's own admin API
 * (PATCH /api/admin/questions/:id). Terravox's own handler only allows
 * setting is_active: true when the SAME request also sends
 * review_status: 'approved' AND translation_status: 'translated' — so
 * "approve" here always sends all three fields together in one PATCH,
 * matching that contract exactly (a second call with only is_active would
 * be rejected by Terravox, since it checks the incoming payload, not the
 * row's current state).
 */

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

const ALLOWED_ACTIONS = new Set(["approve", "reject"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const { id, action } = req.body || {};
  if (typeof id !== "string" || !id.trim()) return res.status(400).json({ error: "Informe o id da pergunta." });
  if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: "Ação inválida. Use approve ou reject." });

  const baseUrl = process.env.TERRAVOX_ADMIN_URL;
  const secret = process.env.TERRAVOX_ADMIN_SECRET;
  if (!baseUrl || !secret) {
    return res.status(503).json({ error: "Integração com o Terravox ainda não configurada (faltam TERRAVOX_ADMIN_URL e/ou TERRAVOX_ADMIN_SECRET)." });
  }

  const update = action === "approve"
    ? { review_status: "approved", translation_status: "translated", is_active: true }
    : { review_status: "rejected", is_active: false };

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/admin/questions/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(update),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Terravox admin review error:", response.status, detail);
      return res.status(502).json({ error: "O Terravox recusou a atualização." });
    }
    const data = await response.json();
    return res.status(200).json({ question: data.question ?? data });
  } catch (error) {
    console.error("Terravox admin review unreachable:", error);
    return res.status(502).json({ error: "Não foi possível alcançar o Terravox." });
  }
}
