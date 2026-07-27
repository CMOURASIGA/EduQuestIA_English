import { generateOpenAIText, getAIDiagnostic, parseJsonResponse, OpenAIDiagnosticError } from "./_openai.js";

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
        required: ["unitId", "unitTitle", "title", "description", "icon", "xpReward", "exercises"],
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
          }
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
  return { id: `ai-mission-${suffix}`, unitId: typeof lesson.unitId === "string" ? lesson.unitId : "adaptive-mission", unitTitle: typeof lesson.unitTitle === "string" ? lesson.unitTitle : "Missão adaptativa", title: typeof lesson.title === "string" ? lesson.title : "Nova missão", description: typeof lesson.description === "string" ? lesson.description : "Uma missão criada para o seu momento de aprendizado.", icon: typeof lesson.icon === "string" ? lesson.icon : "🚀", xpReward: Math.min(120, Math.max(60, Number(lesson.xpReward) || 80)), exercises };
}

function missionInstructions(audience: string, age: unknown, userLevel: unknown) {
  return `Você cria uma única missão de inglês para uma ${audience}, com ${age} anos e nível interno ${userLevel}. Ensine algo novo, sem repetir tema ou palavras centrais das missões concluídas. Não use temas adultos, violência, namoro, dados pessoais ou conteúdo inadequado. Crie 3 a 5 exercícios objetivos, no máximo um writing-challenge. Siga exatamente o esquema JSON fornecido. Todo exercício DEVE conter todos os campos do esquema. Para campos que não se aplicam ao tipo escolhido, devolva string vazia ou array vazio. REGRA INEGOCIÁVEL: prompt é o enunciado exibido na tela e deve ser uma frase não vazia em português em TODOS os exercícios, inclusive writing-challenge. Para opções, use textos em inglês. Em múltipla escolha e preencher lacuna, correctAnswer precisa aparecer em options. Em organize as palavras, options são as palavras embaralhadas e correctAnswer é a frase ordenada. Nos pares, leftPairs e rightPairs devem ter a mesma quantidade e a tradução na mesma posição.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const { age, ageGroup, userLevel = 1, goal, previousLessonTitle, completedLessonTitles = [] } = req.body || {};
  if (!Number.isFinite(Number(age)) || !["kids", "teens"].includes(ageGroup)) return res.status(400).json({ error: "Perfil do aluno inválido para criar a missão." });
  const audience = ageGroup === "kids" ? "criança, com frases muito curtas e temas seguros como animais, espaço, brincadeiras e família" : "pré-adolescente ou adolescente, com temas seguros como games, música, esportes, amizade, viagens e tecnologia";
  try {
    const context = `Objetivo: ${typeof goal === "string" ? goal : "aprender inglês"}\nMissão concluída: ${typeof previousLessonTitle === "string" ? previousLessonTitle : "não informada"}\nNão repetir: ${Array.isArray(completedLessonTitles) ? completedLessonTitles.join(" | ") : "nenhuma"}`;
    const instructions = missionInstructions(audience, age, userLevel);

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
