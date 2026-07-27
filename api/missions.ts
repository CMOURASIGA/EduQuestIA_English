import { generateOpenAIText, getAIDiagnostic, parseJsonResponse, OpenAIDiagnosticError } from "./_openai.js";
import { LearnerSnapshot, learnerContext, missionTeacherInstructions } from "./eduquestTeacher.js";

const allowedTypes = new Set(["multiple-choice", "arrange-words", "fill-blank", "match-pairs", "writing-challenge"]);

const missionJsonSchema = {
  type: "json_schema",
  name: "eduquest_adaptive_mission",
  strict: true,
  schema: {
    type: "object", additionalProperties: false, required: ["lesson"],
    properties: {
      lesson: {
        type: "object", additionalProperties: false,
        required: ["unitId", "unitTitle", "title", "description", "icon", "xpReward", "exercises", "vocabulary"],
        properties: {
          unitId: { type: "string" }, unitTitle: { type: "string" }, title: { type: "string" },
          description: { type: "string" }, icon: { type: "string" }, xpReward: { type: "number" },
          exercises: {
            type: "array", minItems: 3, maxItems: 5,
            items: {
              // Structured Outputs does not allow oneOf. Every field is
              // therefore present in one stable exercise shape. Fields that
              // do not apply to the selected type must be returned empty.
              type: "object", additionalProperties: false,
              required: ["type", "prompt", "options", "correctAnswer", "leftPairs", "rightPairs", "writingPrompt", "audioText", "translationContext"],
              properties: {
                type: { type: "string", enum: ["multiple-choice", "arrange-words", "fill-blank", "match-pairs", "writing-challenge"] },
                prompt: {
                  type: "string",
                  description: "Obrigatório em todos os exercícios. Enunciado em português, claro e específico, nunca vazio. Inclusive em writing-challenge, explique aqui o que o aluno deve fazer."
                },
                options: { type: "array", items: { type: "string" } },
                correctAnswer: { type: "string" },
                leftPairs: { type: "array", items: { type: "string" } },
                rightPairs: { type: "array", items: { type: "string" } },
                writingPrompt: { type: "string" },
                audioText: { type: "string" },
                translationContext: { type: "string" }
              }
            }
          },
          vocabulary: {
            type: "array", minItems: 3, maxItems: 6,
            items: {
              type: "object", additionalProperties: false,
              required: ["word", "translation", "example", "exampleTranslation", "category"],
              properties: {
                word: { type: "string" }, translation: { type: "string" }, example: { type: "string" },
                exampleTranslation: { type: "string" }, category: { type: "string" }
              }
            }
          },
        }
      }
    }
  }
} as const;

class InvalidMissionError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidMissionError"; }
}

function normalizeLesson(raw: any, suffix: string) {
  const lesson = raw?.lesson;
  if (!lesson || !Array.isArray(lesson.exercises) || lesson.exercises.length < 3 || lesson.exercises.length > 5) throw new InvalidMissionError("A missão precisa conter entre 3 e 5 exercícios.");
  const exercises = lesson.exercises.map((exercise: any, index: number) => {
    const label = `Exercício ${index + 1}`;
    if (!allowedTypes.has(exercise?.type)) throw new InvalidMissionError(`${label}: tipo '${String(exercise?.type)}' não é aceito.`);
    if (typeof exercise?.prompt !== "string" || !exercise.prompt.trim()) throw new InvalidMissionError(`${label}: enunciado ausente.`);
    if (exercise.type === "writing-challenge" && (typeof exercise.writingPrompt !== "string" || !exercise.writingPrompt.trim())) throw new InvalidMissionError(`${label}: writingPrompt ausente.`);
    if (["multiple-choice", "fill-blank", "arrange-words"].includes(exercise.type) && (!Array.isArray(exercise.options) || !exercise.options.every((option: unknown) => typeof option === "string") || typeof exercise.correctAnswer !== "string")) throw new InvalidMissionError(`${label}: options ou correctAnswer inválidos.`);
    if (exercise.type === "match-pairs" && (!Array.isArray(exercise.leftPairs) || !Array.isArray(exercise.rightPairs) || exercise.leftPairs.length < 2 || exercise.leftPairs.length !== exercise.rightPairs.length)) throw new InvalidMissionError(`${label}: pares incompletos ou com quantidades diferentes.`);
    return { ...exercise, id: `ai-${suffix}-${index + 1}`, correctAnswer: exercise.type === "writing-challenge" ? "" : exercise.correctAnswer };
  });
  if (!Array.isArray(lesson.vocabulary) || lesson.vocabulary.length < 3) throw new InvalidMissionError("Baú: a missão precisa trazer de 3 a 6 palavras novas.");
  const vocabulary = lesson.vocabulary.map((item: any, index: number) => {
    const fields = ["word", "translation", "example", "exampleTranslation", "category"];
    const invalid = fields.find((field) => typeof item?.[field] !== "string" || !item[field].trim());
    if (invalid) throw new InvalidMissionError(`Baú, palavra ${index + 1}: campo '${invalid}' ausente.`);
    return { word: item.word.trim(), translation: item.translation.trim(), example: item.example.trim(), exampleTranslation: item.exampleTranslation.trim(), category: item.category.trim() };
  });
  return { id: `ai-mission-${suffix}`, unitId: typeof lesson.unitId === "string" ? lesson.unitId : "adaptive-mission", unitTitle: typeof lesson.unitTitle === "string" ? lesson.unitTitle : "Missão adaptativa", title: typeof lesson.title === "string" ? lesson.title : "Nova missão", description: typeof lesson.description === "string" ? lesson.description : "Uma missão criada para o seu momento de aprendizado.", icon: typeof lesson.icon === "string" ? lesson.icon : "🚀", xpReward: Math.min(120, Math.max(60, Number(lesson.xpReward) || 80)), exercises, vocabulary };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const { age, ageGroup, userLevel = 1, goal, previousLessonTitle, completedLessonTitles = [], knownWords = [] } = req.body || {};
  if (!Number.isFinite(Number(age)) || !["kids", "teens"].includes(ageGroup)) return res.status(400).json({ error: "Perfil do aluno inválido para criar a missão." });
  const learner: LearnerSnapshot = { age: Number(age), ageGroup, level: Number(userLevel), goal: typeof goal === "string" ? goal : "aprender inglês", completedLessonTitles: Array.isArray(completedLessonTitles) ? completedLessonTitles.filter((value): value is string => typeof value === "string") : [], knownWords: Array.isArray(knownWords) ? knownWords.filter((value): value is string => typeof value === "string") : [] };
  try {
    const context = learnerContext(learner, typeof previousLessonTitle === "string" ? previousLessonTitle : undefined);
    const instructions = missionTeacherInstructions(learner);

    try {
      const text = await generateOpenAIText({ temperature: 0.5, textFormat: missionJsonSchema, instructions, input: context });
      return res.status(200).json({ lesson: normalizeLesson(parseJsonResponse(text), Date.now().toString(36)) });
    } catch (error) {
      if (!(error instanceof InvalidMissionError)) throw error;

      // A resposta chegou, mas não pode abrir uma missão quebrada. Uma única
      // nova tentativa, com a falha explícita, é mais segura do que inventar
      // dados ou liberar XP sem exercício.
      console.warn(`Missão inválida na primeira tentativa: ${error.message}. Gerando novamente.`);
      const retryText = await generateOpenAIText({
        temperature: 0.2,
        textFormat: missionJsonSchema,
        instructions: `${instructions}\nA tentativa anterior foi rejeitada porque: ${error.message} Gere uma missão inteiramente nova. Revise cada exercício antes de responder e nunca deixe prompt vazio.`,
        input: context,
      });
      return res.status(200).json({ lesson: normalizeLesson(parseJsonResponse(retryText), Date.now().toString(36)) });
    }
  } catch (error: unknown) {
    if (error instanceof InvalidMissionError) {
      const requestId = `mission-${Date.now().toString(36)}`;
      console.error(`[${requestId}] Missão devolvida pela IA fora do contrato: ${error.message}`);
      return res.status(422).json({ error: `A IA gerou uma missão incompleta: ${error.message} Tente novamente. Código: AI_MISSION_INVALID. Rastreio: ${requestId}.`, diagnostic: { code: "AI_MISSION_INVALID", message: error.message, requestId } });
    }
    const diagnostic = getAIDiagnostic(error);
    console.error(`[${diagnostic.requestId}] Erro ao criar missão por IA:`, error);
    return res.status(error instanceof OpenAIDiagnosticError ? error.status : 500).json({ error: `${diagnostic.message} Código: ${diagnostic.code}. Rastreio: ${diagnostic.requestId}.`, diagnostic });
  }
}
