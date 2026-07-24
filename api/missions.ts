import { generateOpenAIText, parseJsonResponse } from "./_openai.js";

const allowedTypes = new Set(["multiple-choice", "arrange-words", "fill-blank", "match-pairs", "writing-challenge"]);

function normalizeLesson(raw: any, suffix: string) {
  const lesson = raw?.lesson;
  if (!lesson || !Array.isArray(lesson.exercises) || lesson.exercises.length < 3 || lesson.exercises.length > 5) throw new Error("A IA não retornou uma missão válida.");
  const exercises = lesson.exercises.map((exercise: any, index: number) => {
    if (!allowedTypes.has(exercise?.type) || typeof exercise?.prompt !== "string") throw new Error("Exercício inválido.");
    if (exercise.type === "writing-challenge" && typeof exercise.writingPrompt !== "string") throw new Error("Desafio de escrita inválido.");
    if (["multiple-choice", "fill-blank", "arrange-words"].includes(exercise.type) && (!Array.isArray(exercise.options) || typeof exercise.correctAnswer !== "string")) throw new Error("Gabarito inválido.");
    if (exercise.type === "match-pairs" && (!Array.isArray(exercise.leftPairs) || !Array.isArray(exercise.rightPairs) || exercise.leftPairs.length !== exercise.rightPairs.length)) throw new Error("Pares inválidos.");
    return { ...exercise, id: `ai-${suffix}-${index + 1}`, correctAnswer: exercise.type === "writing-challenge" ? "" : exercise.correctAnswer };
  });
  return { id: `ai-mission-${suffix}`, unitId: typeof lesson.unitId === "string" ? lesson.unitId : "adaptive-mission", unitTitle: typeof lesson.unitTitle === "string" ? lesson.unitTitle : "Missão adaptativa", title: typeof lesson.title === "string" ? lesson.title : "Nova missão", description: typeof lesson.description === "string" ? lesson.description : "Uma missão criada para o seu momento de aprendizado.", icon: typeof lesson.icon === "string" ? lesson.icon : "🚀", xpReward: Math.min(120, Math.max(60, Number(lesson.xpReward) || 80)), exercises };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "A criação de missões por IA ainda não foi configurada." });
  const { age, ageGroup, userLevel = 1, goal, previousLessonTitle, completedLessonTitles = [] } = req.body || {};
  if (!Number.isFinite(Number(age)) || !["kids", "teens"].includes(ageGroup)) return res.status(400).json({ error: "Perfil do aluno inválido para criar a missão." });
  const audience = ageGroup === "kids" ? "criança, com frases muito curtas e temas seguros como animais, espaço, brincadeiras e família" : "pré-adolescente ou adolescente, com temas seguros como games, música, esportes, amizade, viagens e tecnologia";
  try {
    const text = await generateOpenAIText({ temperature: 0.7, instructions: `Você cria uma única missão de inglês para uma ${audience}, com ${age} anos e nível interno ${userLevel}. Ensine algo novo, sem repetir tema ou palavras centrais das missões concluídas. Não use temas adultos, violência, namoro, dados pessoais ou conteúdo inadequado. Crie 3 a 5 exercícios objetivos, no máximo um writing-challenge. Retorne APENAS JSON: {"lesson":{"id":"slug","unitId":"adaptive","unitTitle":"texto","title":"texto","description":"texto em português","icon":"emoji","xpReward":80,"exercises":[{"id":"ex-1","type":"multiple-choice","prompt":"...","options":["..."],"correctAnswer":"...","translationContext":"..."}]}}. Para fill-blank, multiple-choice e arrange-words inclua options e correctAnswer. Para match-pairs inclua leftPairs e rightPairs. Para writing-challenge inclua writingPrompt em inglês e correctAnswer vazio.`, input: `Objetivo: ${typeof goal === "string" ? goal : "aprender inglês"}\nMissão concluída: ${typeof previousLessonTitle === "string" ? previousLessonTitle : "não informada"}\nNão repetir: ${Array.isArray(completedLessonTitles) ? completedLessonTitles.join(" | ") : "nenhuma"}` });
    return res.status(200).json({ lesson: normalizeLesson(parseJsonResponse(text), Date.now().toString(36)) });
  } catch (error) {
    console.error("Erro ao criar missão por IA:", error);
    return res.status(500).json({ error: "Não foi possível criar uma nova missão agora." });
  }
}
