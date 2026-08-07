import { supabaseRequest, SupabaseRequestError } from "./_supabase.js";

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

const ALLOWED_PRODUCTS = new Set(["eduquest", "terravox", "spaceacademy"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const { contentIds, productCode = "eduquest" } = req.body || {};
  if (!Array.isArray(contentIds) || !contentIds.length) return res.status(400).json({ error: "Informe ao menos um id de conteúdo." });
  if (!ALLOWED_PRODUCTS.has(productCode)) return res.status(400).json({ error: "Produto inválido." });

  try {
    // Only content a human already marked "approved" can be published — this
    // is the gate that keeps unreviewed AI/API-sourced content out of the
    // game, regardless of what the caller asks for.
    const idsFilter = contentIds.join(",");
    const approvedResponse = await supabaseRequest(`learning_content?select=id&status=eq.approved&id=in.(${idsFilter})`);
    const approvedIds = new Set(((await approvedResponse.json()) as { id: string }[]).map((row) => row.id));
    const eligible = contentIds.filter((id: string) => approvedIds.has(id));
    if (!eligible.length) return res.status(422).json({ error: "Nenhum dos ids informados está com status 'approved'." });

    const existingPubResponse = await supabaseRequest(`product_content_publications?select=content_id&product_code=eq.${productCode}&content_id=in.(${eligible.join(",")})`);
    const alreadyPublished = new Set(((await existingPubResponse.json()) as { content_id: string }[]).map((row) => row.content_id));
    const toInsert = eligible.filter((id: string) => !alreadyPublished.has(id));

    if (toInsert.length) {
      const payload = toInsert.map((contentId: string) => ({
        content_id: contentId,
        product_code: productCode,
        is_active: true,
        configuration: { eligible_for_auto_mission: true },
      }));
      await supabaseRequest("product_content_publications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
    }

    return res.status(200).json({ published: toInsert.length, alreadyPublished: eligible.length - toInsert.length, skipped: contentIds.length - eligible.length });
  } catch (error) {
    if (error instanceof SupabaseRequestError) return res.status(error.status).json({ error: error.message });
    console.error("Content publish error:", error);
    return res.status(500).json({ error: "Não foi possível publicar o conteúdo." });
  }
}
