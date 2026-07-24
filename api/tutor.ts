import { generateOpenAIText } from "./_openai";

function difficultyForLevel(userLevel: number): string {
  if (userLevel <= 2) return "Use inglês muito simples, frases curtas e bastante português para orientar. Faça perguntas fáceis de sim/não ou escolha.";
  if (userLevel <= 5) return "Use frases simples em inglês e cerca de 40% de português. Incentive frases curtas e completas.";
  if (userLevel <= 10) return "Fale cerca de 70% em inglês e faça perguntas abertas sobre interesses saudáveis.";
  if (userLevel <= 19) return "Fale cerca de 90% em inglês, com passado, futuro e phrasal verbs simples.";
  return "Fale em inglês fluente, mantendo um tema adequado e educativo.";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "O tutor de IA ainda não foi configurado. Adicione OPENAI_API_KEY nas variáveis do servidor." });

  const { message, history, avatar, ageGroup, childName, userLevel = 1 } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Envie uma mensagem para o tutor." });

  const ageContext = ageGroup === "kids"
    ? "criança menor de 10 anos. Use linguagem extremamente simples, acolhedora e lúdica."
    : "adolescente de 10 a 15 anos. Use tom amigável e saudável, com assuntos como games, música, esportes e tecnologia.";
  const instructions = `Você é ${avatar || "Pip"}, tutor de inglês para ${childName || "um estudante"}, ${ageContext}

${difficultyForLevel(Number(userLevel))}

Regras obrigatórias:
- Responda em no máximo 2 ou 3 parágrafos curtos e use emojis com moderação.
- Mantenha a conversa segura e apropriada para menores de 15 anos. Recuse gentilmente temas impróprios e retome o inglês.
- Se houver erro em inglês, elogie o esforço e mostre a correção com explicação curta. Nunca trate um erro como se estivesse correto.
- Não peça dados pessoais, localização, contatos ou imagens.
- Ajude o estudante a praticar inglês, em vez de apenas dar a resposta.`;

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
  } catch (error) {
    console.error("Erro no tutor de IA:", error);
    return res.status(500).json({ error: "Não foi possível responder agora. Tente novamente em instantes." });
  }
}
