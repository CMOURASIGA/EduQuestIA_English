/**
 * Server-to-server proxy into Terravox's own admin API
 * (GET /api/admin/questions), so the unified review dashboard
 * (public/admin-review.html) can show EduQuest and Terravox pendencies in
 * one place without the browser ever needing Terravox's credentials or
 * hitting CORS — this call happens server-side, browser-to-browser CORS
 * rules don't apply here.
 *
 * Gated by EduQuest's own ADMIN_API_SECRET (same as the other admin-*
 * endpoints) — Terravox's secret (TERRAVOX_ADMIN_SECRET) is only ever used
 * from this server, never sent to the browser.
 */

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.headers["x-admin-secret"] === secret);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const baseUrl = process.env.TERRAVOX_ADMIN_URL;
  const secret = process.env.TERRAVOX_ADMIN_SECRET;
  if (!baseUrl || !secret) {
    return res.status(503).json({ error: "Integração com o Terravox ainda não configurada (faltam TERRAVOX_ADMIN_URL e/ou TERRAVOX_ADMIN_SECRET)." });
  }

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/admin/questions?review_status=pending&translation_status=translated`;
    const response = await fetch(url, { headers: { "x-admin-secret": secret } });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      console.error("Terravox admin list error:", response.status, detail);
      // Surfaced to the browser on purpose: only Terravox's own status/body
      // (never the secret), so a screenshot of the review page's network
      // tab is enough to diagnose wrong URL vs wrong secret vs a real crash
      // on Terravox's side, without needing to cross-reference two separate
      // Vercel log dashboards each time.
      return res.status(502).json({ error: `O Terravox respondeu ${response.status} em ${url}: ${detail || "(corpo vazio)"}` });
    }
    const data = await response.json();
    return res.status(200).json({ questions: data.questions ?? [] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Terravox admin list unreachable:", error);
    return res.status(502).json({ error: `Não foi possível alcançar o Terravox (${baseUrl}): ${detail}` });
  }
}
