/**
 * Server-to-server proxy into Terravox's own admin API
 * (POST /api/admin/questions/import/opentdb), so the unified review
 * dashboard (public/admin-review.html) can trigger a new trivia import
 * without curl. Gated by EduQuest's own ADMIN_API_SECRET like the other
 * admin-* endpoints; TERRAVOX_ADMIN_SECRET is only ever used from this
 * server, never sent to the browser.
 *
 * Imported items land as review_status: "pending" on Terravox's side —
 * this only fetches+stores raw trivia, it never approves or activates
 * anything. They also need translation_status: "translated" (Terravox's
 * own Gemini-based translation step, gated by its GEMINI_API_KEY) before
 * they show up in admin-terravox-list's filtered query.
 */

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.headers["x-admin-secret"] === secret);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const baseUrl = process.env.TERRAVOX_ADMIN_URL;
  const secret = process.env.TERRAVOX_ADMIN_SECRET;
  if (!baseUrl || !secret) {
    return res.status(503).json({ error: "Integração com o Terravox ainda não configurada (faltam TERRAVOX_ADMIN_URL e/ou TERRAVOX_ADMIN_SECRET)." });
  }

  const { amount, difficulty, categoryId } = req.body || {};
  const payload: Record<string, unknown> = { amount: Math.min(Math.max(Number(amount) || 20, 1), 50) };
  if (typeof difficulty === "string" && difficulty) payload.difficulty = difficulty;
  if (categoryId !== undefined && categoryId !== null && categoryId !== "") payload.categoryId = Number(categoryId);

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/admin/questions/import/opentdb`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 400);
      console.error("Terravox admin import error:", response.status, detail);
      return res.status(502).json({ error: `O Terravox respondeu ${response.status} em ${url}: ${detail || "(corpo vazio)"}` });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Terravox admin import unreachable:", error);
    return res.status(502).json({ error: `Não foi possível alcançar o Terravox (${baseUrl}): ${detail}` });
  }
}
