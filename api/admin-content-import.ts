import { SupabaseRequestError } from "./_supabase.js";
import { getAIDiagnostic, OpenAIDiagnosticError } from "./_openai.js";
import { runContentImport, ContentImportError, CEFR_LEVELS } from "./_contentImportCore.js";

function isAdminRequest(req: any): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && req.header("x-admin-secret") === secret);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Acesso administrativo necessário." });

  const { theme, targetLevel, amount = 5 } = req.body || {};
  if (typeof theme !== "string" || !theme.trim()) return res.status(400).json({ error: "Informe um tema em inglês, ex: 'animals', 'school', 'food'." });
  if (typeof targetLevel !== "string" || !CEFR_LEVELS.has(targetLevel)) return res.status(400).json({ error: "Nível inválido. Use pre_a1, a1, a2 ou b1." });

  try {
    const result = await runContentImport({
      theme: theme.trim().toLowerCase(),
      targetLevel,
      amount: Math.min(Math.max(Number(amount) || 5, 1), 15),
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof SupabaseRequestError) return res.status(error.status).json({ error: error.message });
    if (error instanceof ContentImportError) return res.status(error.status).json({ error: error.message });
    if (error instanceof OpenAIDiagnosticError) {
      const diagnostic = getAIDiagnostic(error);
      return res.status(error.status).json({ error: diagnostic.message, diagnostic });
    }
    console.error("Content import error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Falha desconhecida na importação de conteúdo." });
  }
}
