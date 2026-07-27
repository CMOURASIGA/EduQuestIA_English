import { generateOpenAIText, getAIDiagnostic, OpenAIDiagnosticError } from "./_openai.js";
import { LearnerSnapshot, tutorTeacherInstructions } from "./eduquestTeacher.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const { message, history, avatar, ageGroup, childName, userLevel = 1, age, goal, knownWords = [] } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Envie uma mensagem para o tutor." });
  if (!["kids", "teens"].includes(ageGroup)) return res.status(400).json({ error: "Perfil do aluno inválido para o tutor." });

  const learner: LearnerSnapshot = { age: Number.isFinite(Number(age)) ? Number(age) : ageGroup === "kids" ? 8 : 13, ageGroup, level: Number(userLevel), goal: typeof goal === "string" ? goal : "aprender inglês", completedLessonTitles: [], knownWords: Array.isArray(knownWords) ? knownWords.filter((word): word is string => typeof word === "string") : [] };
  const instructions = tutorTeacherInstructions(learner, typeof avatar === "string" ? avatar : "Pip", typeof childName === "string" ? childName : "um estudante");

  const normalizedHistory = Array.isArray(history)
    ? history.slice(-12).filter((turn: any) => typeof turn?.content === "string").map((turn: any) => ({
        role: turn.role === "user" ? "user" as const : "assistant" as const,
        content: turn.content,
      }))
    : [];

  try {
    const reply = await generateOpenAIText({
      instructions,
      input: [...normalizedHistory, { role: "user", content: message }],
      temperature: 0.6,
    });
    return res.status(200).json({ reply });
  } catch (error: unknown) {
    const diagnostic = getAIDiagnostic(error);
    console.error(`[${diagnostic.requestId}] Erro no tutor de IA:`, error);
    return res.status(error instanceof OpenAIDiagnosticError ? error.status : 500).json({ error: `${diagnostic.message} Código: ${diagnostic.code}. Rastreio: ${diagnostic.requestId}.`, diagnostic });
  }
}
