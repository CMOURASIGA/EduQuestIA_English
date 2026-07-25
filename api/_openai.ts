const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export class OpenAIDiagnosticError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly requestId: string) {
    super(message);
    this.name = "OpenAIDiagnosticError";
  }
}

function createRequestId() {
  return `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function diagnosticForOpenAIError(status: number, payload: any): { code: string; message: string } {
  const providerCode = payload?.error?.code;
  if (status === 401) return { code: "OPENAI_AUTH_FAILED", message: "A OpenAI recusou a chave configurada. Confira OPENAI_API_KEY no Vercel, inclusive se foi copiada por inteiro e está ativa." };
  if (status === 403) return { code: "OPENAI_ACCESS_DENIED", message: "A chave foi reconhecida, mas não tem permissão para usar este projeto ou modelo. Confira a service account e o projeto na OpenAI." };
  if (status === 429 && providerCode === "insufficient_quota") return { code: "OPENAI_INSUFFICIENT_QUOTA", message: "A conta OpenAI não possui crédito ou limite disponível. Confira Billing e Usage Limits na plataforma OpenAI." };
  if (status === 429) return { code: "OPENAI_RATE_LIMIT", message: "A OpenAI atingiu temporariamente o limite de chamadas. Aguarde um momento e tente novamente." };
  if (status === 400 && providerCode === "model_not_found") return { code: "OPENAI_MODEL_NOT_FOUND", message: `O modelo '${OPENAI_MODEL}' não está disponível para esta chave. Confira OPENAI_MODEL no Vercel.` };
  if (status === 400) return { code: "OPENAI_BAD_REQUEST", message: "A OpenAI rejeitou o formato da solicitação. O detalhe técnico está registrado no log do Vercel." };
  if (status >= 500) return { code: "OPENAI_PROVIDER_UNAVAILABLE", message: "A OpenAI ficou indisponível temporariamente. Tente novamente em alguns instantes." };
  return { code: "OPENAI_REQUEST_FAILED", message: "A chamada para a OpenAI falhou. O detalhe técnico está registrado no log do Vercel." };
}

export function getAIDiagnostic(error: unknown) {
  if (error instanceof OpenAIDiagnosticError) return { code: error.code, message: error.message, requestId: error.requestId };
  const requestId = createRequestId();
  console.error(`[${requestId}] Falha interna não classificada da IA:`, error);
  return { code: "AI_FUNCTION_ERROR", message: "A função de IA falhou antes de receber uma resposta da OpenAI. Consulte os logs do Vercel usando o código de rastreio.", requestId };
}

/**
 * A API Responses devolve o texto dentro de `output[].content[]` no JSON
 * bruto. Alguns clientes também expõem o atalho `output_text`; por isso
 * aceitamos ambos os formatos sem depender de um SDK no runtime do Vercel.
 */
function extractResponseText(payload: any): string | null {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) return null;

  const text = payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((content: any) => content?.type === "output_text" && typeof content?.text === "string")
    .map((content: any) => content.text.trim())
    .filter(Boolean)
    .join("\n");

  return text || null;
}

export async function generateOpenAIText({
  instructions,
  input,
  temperature = 0.4,
  textFormat,
}: {
  instructions: string;
  input: string | Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
  /** Optional Responses API structured-output definition. */
  textFormat?: Record<string, unknown>;
}): Promise<string> {
  const requestId = createRequestId();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAIDiagnosticError(503, "OPENAI_KEY_MISSING", "OPENAI_API_KEY não está configurada neste ambiente do Vercel. Cadastre-a para Preview e/ou Production e faça um novo deploy.", requestId);

  let response: Response;
  try {
    response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input,
      temperature,
      ...(textFormat ? { text: { format: textFormat } } : {}),
    }),
    });
  } catch (error) {
    console.error(`[${requestId}] Não foi possível conectar à OpenAI:`, error);
    throw new OpenAIDiagnosticError(502, "OPENAI_NETWORK_ERROR", "A função não conseguiu se conectar à OpenAI. Consulte os logs do Vercel com o código de rastreio.", requestId);
  }

  const rawBody = await response.text();
  let payload: any;
  try { payload = rawBody ? JSON.parse(rawBody) : {}; }
  catch { throw new OpenAIDiagnosticError(502, "OPENAI_INVALID_RESPONSE", "A OpenAI retornou uma resposta em formato inesperado. Consulte os logs do Vercel com o código de rastreio.", requestId); }
  if (!response.ok) {
    const diagnostic = diagnosticForOpenAIError(response.status, payload);
    console.error(`[${requestId}] Erro da OpenAI (${response.status}, ${diagnostic.code}):`, payload);
    throw new OpenAIDiagnosticError(response.status, diagnostic.code, diagnostic.message, requestId);
  }

  const outputText = extractResponseText(payload);
  if (!outputText) {
    console.error(`[${requestId}] Resposta OpenAI sem texto extraível:`, {
      id: payload?.id,
      status: payload?.status,
      incomplete_details: payload?.incomplete_details,
      output_types: Array.isArray(payload?.output)
        ? payload.output.flatMap((item: any) => Array.isArray(item?.content) ? item.content.map((content: any) => content?.type) : [])
        : [],
    });
    throw new OpenAIDiagnosticError(502, "OPENAI_EMPTY_RESPONSE", "A OpenAI respondeu, mas não devolveu conteúdo utilizável. Consulte os logs do Vercel com o código de rastreio.", requestId);
  }

  return outputText;
}

export function parseJsonResponse(text: string): unknown {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(withoutFence);
}
