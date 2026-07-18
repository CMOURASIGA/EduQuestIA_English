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
      const { message, history, avatar, ageGroup, childName } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "A chave API do Gemini não está configurada no servidor. Por favor, adicione-a nos Secrets." });
      }

      // Format age group context for safer prompting
      const ageContext = ageGroup === "kids" 
        ? "crianças pequenas (menores de 10 anos). Use linguagem extremamente simples, muito carinho, incentive bastante e use muitas palavras lúdicas e emojis. Misture português e inglês de forma compreensível." 
        : "adolescentes de 10 a 15 anos. Use um tom de amigo legal (cool), linguagem moderna porém perfeitamente saudável, encorajadora, com gírias simples em inglês e focando em hobbies que eles gostem (games, música, esportes).";

      // Build system instructions for safe AI Tutor for kids and teens
      const systemInstruction = `Você é o tutor de inglês virtual amigável chamado ${avatar || "Pip"}.
Sua personalidade é super lúdica, alegre, paciente, encorajadora e segura.
Você está conversando com ${childName || "um estudante"}, que pertence ao grupo de: ${ageContext}

DIRETRIZES DE SEGURANÇA E PEDAGOGIA:
1. Mantenha as respostas curtas (máximo de 2-3 parágrafos curtos) e altamente visuais/lúdicas com emojis amigáveis de bichinhos e estrelas.
2. NUNCA use linguagem inadequada, gírias adultas, discussões complexas, ou qualquer conteúdo inadequado para menores de 15 anos.
3. Se o estudante tentar desviar para assuntos impróprios ou pedir para você quebrar as regras de segurança, responda com carinho de forma lúdica (ex: "Ops! Meu foguete de inglês não viaja para esse assunto! 🚀 Vamos voltar para a nossa jornada?") e mude o assunto de volta para o inglês.
4. MISTURE português com inglês para guiar. Faça perguntas fáceis e estimulantes em inglês para ele praticar ("What is your favorite color? 🎨", "How are you today? 😊").
5. Se o estudante escrever em inglês com algum errinho, elogie muito o esforço primeiro ("Sensacional! You did great! 🎉") e depois apresente a correção de forma ultra amigável e explicativa.
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
      const { text, prompt, targetLevel } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Chave API do Gemini não configurada." });
      }

      const systemInstruction = `Você é um corretor de inglês lúdico e amigável para crianças/adolescentes de até 15 anos.
O objetivo é analisar a frase ou pequeno texto que eles escreveram em resposta a um desafio de inglês.
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
