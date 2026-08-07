/**
 * Generic Supabase REST helper shared by the admin content-import pipeline.
 * Kept separate from learningCatalog.ts's private helper on purpose: the
 * catalog path is already live in production and validated end to end, so
 * it is not touched here to avoid any risk of regressing it.
 */

export class SupabaseRequestError extends Error {
  constructor(message: string, public readonly status = 503) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

export async function supabaseRequest(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new SupabaseRequestError("O Supabase ainda não está configurado neste ambiente. Cadastre SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");

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
    throw new SupabaseRequestError("Não foi possível alcançar o Supabase.");
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase request error:", response.status, detail);
    throw new SupabaseRequestError(response.status === 401 || response.status === 403
      ? "Sem permissão para acessar o Supabase (confira a service role key)."
      : "O Supabase está indisponível no momento.", response.status);
  }
  return response;
}
