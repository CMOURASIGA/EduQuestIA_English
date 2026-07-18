import React, { useState, useRef, useEffect } from "react";
import { UserProfile, ChatMessage, AvatarType } from "../types";
import { Volume2, Send, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { getLevelAndProgress } from "../utils/levels";

interface TutorChatProps {
  profile: UserProfile;
}

const AVATAR_SPECS: Record<AvatarType, { name: string; icon: string; welcome: string }> = {
  bunny: { name: "Pip", icon: "🐰", welcome: "Hi! I am Pip, your bunny tutor! 🐰 Let's chat in English! What is your favorite animal? Write below! Or click a suggestion!" },
  bear: { name: "Barnaby", icon: "🐻", welcome: "Hello, my friend! 🐻 Barnaby here, ready to help you with your English. How was your day? Tell me in simple English!" },
  fox: { name: "Fiona", icon: "🦊", welcome: "Hey! 🦊 Fiona ready to play and learn. Ask me anything in English, or tell me your favorite colors!" },
  lion: { name: "Leo", icon: "🦁", welcome: "Roar! 🦁 Leo here! Let's conquer English together today! What is your name and how old are you?" }
};

const speakEnglish = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
};

export default function TutorChat({ profile }: TutorChatProps) {
  const avatarSpec = AVATAR_SPECS[profile.avatar];
  
  // Initialize with welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: avatarSpec.welcome,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [quotaCount, setQuotaCount] = useState<number>(0);
  const maxQuota = 10; // 10 message limit per day/session
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading || quotaCount >= maxQuota) return;
    
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setQuotaCount((prev) => prev + 1);

    try {
      // Build history payload for backend
      const history = messages.slice(1).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const { level: userLevel } = getLevelAndProgress(profile.xp);

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          avatar: avatarSpec.name,
          ageGroup: profile.ageGroup,
          childName: profile.displayName,
          userLevel
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        const replyMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "model",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages((prev) => [...prev, replyMsg]);
        // Pronounce automatically for better interaction
        speakEnglish(data.reply);
      } else {
        throw new Error(data.error || "Erro de conexão com o tutor.");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Math.random(),
          role: "model",
          content: `Oops! Meu foguete de inglês balançou! 🚀 ${err.message || "Por favor, verifique a chave do Gemini."}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = profile.ageGroup === "kids" 
    ? [
        "Hi, what is your name? 👋",
        "I love colors! 🎨",
        "How are you? 😊",
        "Let's play a game! 🎮"
      ]
    : [
        "How do you say 'futebol' in English? ⚽",
        "Explain the verb to be! 📚",
        "Let's practice a conversation! 💬",
        "Give me a simple English word quiz! ⭐"
      ];

  const resetChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        content: avatarSpec.welcome,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    setQuotaCount(0);
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-white rounded-3xl border-3 border-slate-100 shadow-sm overflow-hidden" id="tutor-chat-box">
      
      {/* Header */}
      <div className="bg-slate-50 border-b-2 border-slate-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce">{avatarSpec.icon}</span>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
              {avatarSpec.name} - Tutor Virtual de IA <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              Personalizado para o perfil {profile.displayName} ({profile.ageGroup === "kids" ? "🧸 Kids" : "🎮 Teens"})
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">
            Mensagens: {quotaCount}/{maxQuota}
          </span>
          <button
            type="button"
            onClick={resetChat}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 transition-all cursor-pointer"
            title="Reiniciar chat"
            id="tutor-reset-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/20" id="chat-messages-container">
        
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              {!isUser && <span className="text-2xl mt-1 select-none">{avatarSpec.icon}</span>}
              
              <div className="flex flex-col">
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed font-semibold relative ${
                    isUser 
                      ? "bg-sky-500 text-white rounded-tr-none" 
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  
                  {/* Speaker Pronounce button for model messages */}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => speakEnglish(m.content)}
                      className="absolute bottom-2 right-2 p-1 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-600 transition-all cursor-pointer border border-sky-100"
                      title="Ouvir pronúncia"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className={`text-[10px] text-slate-400 mt-1 font-bold ${isUser ? "text-right" : "text-left"}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-2 mr-auto max-w-[80%]">
            <span className="text-2xl animate-spin">🪄</span>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Warning if limit reached */}
      {quotaCount >= maxQuota && (
        <div className="bg-amber-50 border-y border-amber-200 p-3 flex items-center gap-2 text-amber-800 text-xs font-bold justify-center">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Você atingiu o limite de {maxQuota} mensagens para este ciclo saudável de IA. Reinicie para praticar mais!</span>
        </div>
      )}

      {/* Quick replies suggestions */}
      <div className="bg-slate-50 px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none border-t border-slate-100">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            type="button"
            disabled={loading || quotaCount >= maxQuota}
            onClick={() => handleSend(reply)}
            className="py-1.5 px-3 bg-white hover:bg-sky-50 text-sky-700 font-extrabold text-xs rounded-full border border-slate-200 hover:border-sky-200 shadow-xs transition-all cursor-pointer shrink-0"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-white border-t-2 border-slate-100 flex items-center gap-2"
      >
        <input
          type="text"
          id="tutor-chat-input"
          value={input}
          disabled={loading || quotaCount >= maxQuota}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva algo em inglês ou português..."
          className="flex-1 px-4 py-3 border border-slate-200 outline-none focus:border-sky-400 bg-slate-50/50 rounded-xl text-slate-800 font-semibold placeholder:text-slate-400 text-sm"
        />
        <button
          type="submit"
          id="tutor-chat-send"
          disabled={!input.trim() || loading || quotaCount >= maxQuota}
          className="p-3 bg-sky-400 hover:bg-sky-501 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
