import { generateOpenAIText, getAIDiagnostic, OpenAIDiagnosticError, parseJsonResponse } from "./_openai.js";
import { writingTeacherInstructions } from "./eduquestTeacher.js";

function criteriaForLevel(level: number): string {
  if (level <= 2) return "Avalie com acolhimento, mas sem marcar uma frase incorreta como correta. Considere correta apenas uma frase compreensível, em inglês e alinhada ao desafio. Pequenos erros de digitação podem ser aceitos somente se não mudarem o sentido.";
  if (level <= 5) return "Verifique se há uma frase simples e completa em inglês. Corrija concordância elementar, vocabulário e digitação que prejudique o sentido.";
  if (level <= 10) return "Verifique estrutura de frases, preposições comuns e tempos verbais básicos. Uma resposta com erro relevante deve receber isCorrect false.";
  if (level <= 19) return "Avalie com rigor pedagógico moderado, incluindo tempos verbais, conjugação e riqueza de vocabulário.";
  return "Avalie naturalidade, coesão e precisão gramatical com padrão de conversação fluente.";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });

  const { text, prompt, userLevel = 1, ageGroup = "kids" } = req.body || {};
  if (typeof text !== "string" || !text.trim() || typeof prompt !== "string") {
    return res.status(400).json({ error: "Envie a frase do aluno e o enunciado do desafio." });
  }
  if (!["kids", "teens"].includes(ageGroup)) return res.status(400).json({ error: "Perfil do aluno inválido para a correção." });

  try {
    const response = await generateOpenAIText({
      input: `Desafio proposto: "${prompt}"\nTexto escrito pelo aluno: "${text}"`,
      temperature: 0.2,
      instructions: `${writingTeacherInstructions(Number(userLevel), ageGroup, criteriaForLevel(Number(userLevel)))}

Retorne APENAS JSON neste formato:
{
  "isCorrect": false,
  "celebration": "elogio breve pelo esforço",
  "corrections": ["explicação objetiva do ajuste, se houver"],
  "improvedVersion": "frase corrigida em inglês",
  "explanation": "explicação em português simples do que foi aprendido"
}

Use isCorrect true somente quando a resposta estiver correta para o desafio e sem erro relevante de gramática, vocabulário ou estrutura. Se houver erro relevante, use false, explique o motivo e forneça a versão corrigida. Nunca diga que algo incorreto está certo.`
    });

    const feedback = parseJsonResponse(response) as Record<string, unknown>;
    if (typeof feedback.isCorrect !== "boolean") throw new Error("Resposta de avaliação inválida.");
    return res.status(200).json(feedback);
  } catch (error: unknown) {
    const diagnostic = getAIDiagnostic(error);
    console.error(`[${diagnostic.requestId}] Erro no corretor de escrita:`, error);
    return res.status(error instanceof OpenAIDiagnosticError ? error.status : 500).json({ error: `${diagnostic.message} Código: ${diagnostic.code}. Rastreio: ${diagnostic.requestId}.`, diagnostic });
  }
}
