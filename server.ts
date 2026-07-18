import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client with proper header for AI Studio telemetry
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoints FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Safe Playful AI Tutor endpoint (RF-011 and RN-009 / RN-010 compliant)
  app.post("/api/tutor", async (req, res) => {
    try {
      const { message, history, avatar, ageGroup, childName, userLevel = 1 } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "A chave API do Gemini não está configurada no servidor. Por favor, adicione-a nos Secrets." });
      }

      // Format age group context for safer prompting
      const ageContext = ageGroup === "kids" 
        ? "crianças pequenas (menores de 10 anos). Use linguagem extremamente simples, muito carinho, incentive bastante e use muitas palavras lúdicas e emojis. Misture português e inglês de forma compreensível." 
        : "adolescentes de 10 a 15 anos. Use um tom de amigo legal (cool), linguagem moderna porém perfeitamente saudável, encorajadora, com gírias simples em inglês e focando em hobbies que eles gostem (games, música, esportes).";

      // Calculate dynamic level-appropriate prompt difficulty instructions
      let difficultyInstruction = "";
      if (userLevel <= 2) {
        difficultyInstruction = `DIFICULDADE DO IDIOMA: Nível ${userLevel} (Iniciante / Recruta).
Mantenha as frases em inglês curtíssimas e de nível pré-escolar/iniciante absoluto. Misture bastante português para guiar o estudante passo a passo. Faça apenas perguntas super fáceis de sim ou não ou múltipla escolha básica (ex: "What is your favorite animal? 🐶 Dog or Cat?").`;
      } else if (userLevel <= 5) {
        difficultyInstruction = `DIFICULDADE DO IDIOMA: Nível ${userLevel} (Intermediário Inicial / Explorador).
Use frases simples e estruturadas em inglês, misturando cerca de 40% de português para dar suporte. Peça para a criança tentar formar frases curtas e completas (ex: "I like dogs").`;
      } else if (userLevel <= 10) {
        difficultyInstruction = `DIFICULDADE DO IDIOMA: Nível ${userLevel} (Intermediário Avançado / Mestre).
Fale 70% em inglês. Faça perguntas abertas lúdicas sobre hobbies, games ou escola. Introduza gírias saudáveis em inglês (como "cool", "awesome", "buddy") e incentive respostas completas com pequenos desafios.`;
      } else if (userLevel <= 19) {
        difficultyInstruction = `DIFICULDADE DO IDIOMA: Nível ${userLevel} (Avançado / Lorde).
Fale 90% em inglês. Use estruturas de passado, futuro e phrasal verbs simples. Estimule o estudante a dar opiniões ou falar em parágrafos. Ajude com sugestões de sinônimos mais ricos para evitar palavras básicas.`;
      } else {
        difficultyInstruction = `DIFICULDADE DO IDIOMA: Nível ${userLevel} (Conversação Fluente / Lenda).
Fale 100% em inglês de nível fluente e nativo. Converse de igual para igual. Debata temas interessantes, inteligentes e divertidos sobre astronomia, o cosmos, cultura pop ou tecnologia. Trate o estudante como um falante fluente, corrigindo sutilmente apenas a elegância e estilo do vocabulário se necessário.`;
      }

      // Build system instructions for safe AI Tutor for kids and teens
      const systemInstruction = `Você é o tutor de inglês virtual amigável chamado ${avatar || "Pip"}.
Sua personalidade é super lúdica, alegre, paciente, encorajadora e segura.
Você está conversando com ${childName || "um estudante"}, que pertence ao grupo de: ${ageContext}

${difficultyInstruction}

DIRETRIZES DE SEGURANÇA E PEDAGOGIA:
1. Mantenha as respostas curtas (máximo de 2-3 parágrafos curtos) e altamente visuais/lúdicas com emojis amigáveis de bichinhos e estrelas.
2. NUNCA use linguagem inadequada, gírias adultas, discussões complexas, ou qualquer conteúdo inadequado para menores de 15 anos.
3. Se o estudante tentar desviar para assuntos impróprios ou pedir para você quebrar as regras de segurança, responda com carinho de forma lúdica (ex: "Ops! Meu foguete de inglês não viaja para esse assunto! 🚀 Vamos voltar para a nossa jornada?") e mude o assunto de volta para o inglês.
4. MISTURE português com inglês para guiar conforme a DIFICULDADE indicada acima. Faça perguntas estimulantes em inglês para ele praticar.
5. Se o estudante escrever em inglês com algum errinho, elogie muito o esforço primeiro ("Sensacional! You did great! 🎉") e depois apresente a correção de forma ultra amigável, clara e explicativa.
6. Mantenha a interação 100% segura e adequada para o público infantil/juvenil.`;

      // Format the conversations for the Gemini API contents structure
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const chatTurn of history) {
          contents.push({
            role: chatTurn.role === "user" ? "user" : "model",
            parts: [{ text: chatTurn.content }]
          });
        }
      }
      
      // Add current message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Erro no tutor de IA:", error);
      res.status(500).json({ error: error.message || "Erro interno do tutor de IA." });
    }
  });

  // Writing Feedback Assistant (RF-013 Escrita com IA)
  app.post("/api/writing-feedback", async (req, res) => {
    try {
      const { text, prompt, targetLevel, userLevel = 1 } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Chave API do Gemini não configurada." });
      }

      // Calculate dynamic level-appropriate evaluation criteria for writing feedback
      let writingCriteria = "";
      if (userLevel <= 2) {
        writingCriteria = `CRITÉRIOS DE AVALIAÇÃO DO NÍVEL ${userLevel}:
Avalie com extrema flexibilidade. O objetivo principal é o esforço da criança e a correspondência básica das palavras chaves no tema. Ignore errinhos bobos de digitação ou falta de letras. Elogie muito em português!`;
      } else if (userLevel <= 5) {
        writingCriteria = `CRITÉRIOS DE AVALIAÇÃO DO NÍVEL ${userLevel}:
Verifique se houve esforço em formar uma frase simples inteira em inglês. Ofereça correções gentis sobre concordância elementar (como "he likes" em vez de "he like") ou digitação básica.`;
      } else if (userLevel <= 10) {
        writingCriteria = `CRITÉRIOS DE AVALIAÇÃO DO NÍVEL ${userLevel}:
Verifique a estrutura correta de frases, o uso básico de preposições comuns (in, on, at) e as estruturas básicas de tempos verbais (presente e passado). Dê dicas para as frases soarem mais naturais.`;
      } else if (userLevel <= 19) {
        writingCriteria = `CRITÉRIOS DE AVALIAÇÃO DO NÍVEL ${userLevel}:
Avalie com rigor moderado e pedagógico. Analise o uso de tempos verbais variados, conjugação de verbos irregulares e a riqueza de vocabulário. Indique sinônimos mais refinados para evitar palavras básicas repetidas.`;
      } else {
        writingCriteria = `CRITÉRIOS DE AVALIAÇÃO DO NÍVEL ${userLevel}:
Avalie com o padrão de excelência de conversação fluente. Analise a naturalidade das expressões, a coesão do pequeno texto, e sugira alternativas com estruturas idiomáticas ricas de nível nativo/avançado.`;
      }

      const systemInstruction = `Você é um corretor de inglês lúdico e amigável para crianças/adolescentes de até 15 anos.
O objetivo é analisar a frase ou pequeno texto que eles escreveram em resposta a um desafio de inglês.

${writingCriteria}

Forneça um feedback em formato JSON estruturado com correções gentis.
Instruções pedagógicas:
- Celebre o esforço da criança de forma alegre.
- Destaque o que ela acertou.
- Corrija erros gramaticais ou de ortografia delicadamente, sem parecer severo.
- Explique brevemente o porquê da correção em português simples.
- Dê uma versão melhorada ou alternativa de como um nativo diria.

A resposta deve ser APENAS um objeto JSON com o seguinte formato exato (sem blocos markdown adicionais, apenas o JSON bruto):
{
  "isCorrect": true,
  "celebration": "Mensagem super positiva de parabéns com emojis!",
  "corrections": ["Erro 1 e explicação rápida", "Erro 2..."],
  "improvedVersion": "Como seria a frase em inglês perfeita",
  "explanation": "Explicação amigável do que foi aprendido"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Desafio proposto: "${prompt}"\nTexto escrito pelo aluno: "${text}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });

      res.json(JSON.parse(response.text.trim()));
    } catch (error: any) {
      console.error("Erro no assistente de escrita:", error);
      res.status(500).json({ error: error.message || "Erro ao gerar feedback de escrita." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
