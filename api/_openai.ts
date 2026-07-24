const OPENAI_API_URL = "https://api.openai.com/v1/responses";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function generateOpenAIText({
  instructions,
  input,
  temperature = 0.4,
}: {
  instructions: string;
  input: string | Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");

  const response = await fetch(OPENAI_API_URL, {
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
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error("Erro da OpenAI:", payload);
    throw new Error("A IA não está disponível no momento.");
  }

  if (typeof payload.output_text !== "string" || !payload.output_text.trim()) {
    throw new Error("A IA retornou uma resposta vazia.");
  }

  return payload.output_text.trim();
}

export function parseJsonResponse(text: string): unknown {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(withoutFence);
}
