import React, { useState } from "react";
import { UserProfile, WritingFeedback } from "../types";
import { Sparkles, Send, Award, BookOpen, AlertCircle, Volume2 } from "lucide-react";
import { getLevelAndProgress, getLevelTitle } from "../utils/levels";

interface WritingChallengeProps {
  profile: UserProfile;
  onXpEarned: (xp: number) => void;
}

interface Challenge {
  id: string;
  title: string;
  emoji: string;
  prompt: string;
  placeholder: string;
  hints: string[];
}

const CHALLENGES: Challenge[] = [
  {
    id: "wc-1",
    title: "Minha Comida Favorita 🍕",
    emoji: "🍕",
    prompt: "Escreva uma pequena frase sobre sua comida favorita em inglês. Ex: 'I like pizza because it is delicious.'",
    placeholder: "I love pasta and ice cream...",
    hints: ["like (gostar)", "because (porque)", "delicious (delicioso)", "favorite food (comida favorita)"]
  },
  {
    id: "wc-2",
    title: "Meu Melhor Amigo 🐶",
    emoji: "🐶",
    prompt: "Escreva sobre seu pet ou seu melhor amigo humano em inglês. Ex: 'My dog is named Bob and he is brown.'",
    placeholder: "My best friend is Alex, he is cool...",
    hints: ["friend (amigo)", "dog (cachorro)", "cat (gato)", "play (brincar)", "cute (fofo)"]
  },
  {
    id: "wc-3",
    title: "Meus Super Hobbies 🎮",
    emoji: "🎮",
    prompt: "Escreva sobre o que você mais ama fazer no tempo livre em inglês. Ex: 'I like playing video games after school.'",
    placeholder: "I love playing minecraft and reading...",
    hints: ["play games (jogar)", "read books (ler livros)", "watch movies (assistir filmes)", "love (amar)"]
  }
];

const speakEnglish = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
};

export default function WritingChallenge({ profile, onXpEarned }: WritingChallengeProps) {
  const [selectedId, setSelectedId] = useState<string>("wc-1");
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [completedList, setCompletedList] = useState<string[]>([]);

  const selectedChallenge = CHALLENGES.find((c) => c.id === selectedId) || CHALLENGES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const { level: userLevel } = getLevelAndProgress(profile.xp);
      const res = await fetch("/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          prompt: selectedChallenge.prompt,
          targetLevel: profile.ageGroup === "kids" ? "A1-Kids" : "A1-Teens",
          userLevel
        })
      });

      const data = await res.json();
      if (!res.ok || typeof data.isCorrect !== "boolean") {
        throw new Error(data.error || "Não foi possível avaliar a resposta.");
      }
      setFeedback(data);

      if (data.isCorrect === true) {
        if (!completedList.includes(selectedId)) {
          setCompletedList([...completedList, selectedId]);
          // Award 40 XP bônus for writing challenge!
          onXpEarned(40);
        }
      }
    } catch (err: any) {
      console.error(err);
      const diagnosticMessage = err instanceof Error ? err.message : "Não foi possível avaliar a resposta.";
      // Never reward an answer that was not evaluated.
      setFeedback({
        isCorrect: false,
        celebration: "Não consegui avaliar sua frase agora.",
        corrections: [diagnosticMessage],
        improvedVersion: inputText,
        explanation: "Nenhum XP foi concedido porque a resposta não pôde ser validada."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="writing-challenge-container">
      
      {/* Prompt selector sidebar */}
      <div className="md:col-span-1 flex flex-col gap-2">
        <h3 className="font-extrabold text-slate-800 text-sm mb-2">Selecione uma Missão</h3>
        {CHALLENGES.map((c) => {
          const isDone = completedList.includes(c.id);
          const isSelected = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                setInputText("");
                setFeedback(null);
              }}
              className={`p-3 rounded-xl text-left font-bold text-xs transition-all flex items-center justify-between ${
                isSelected 
                  ? "bg-indigo-50 text-indigo-800 border-2 border-indigo-200" 
                  : "bg-white border border-slate-100 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{c.emoji}</span>
                <span>{c.title}</span>
              </div>
              {isDone && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">
                  ✓ FEITO
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Workspace */}
      <div className="md:col-span-2 flex flex-col gap-4">
        
        {/* Active prompt instruction card */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl">
          <span className="text-[10px] font-black text-indigo-700 tracking-wider uppercase block">Instrução da Missão:</span>
          <p className="font-extrabold text-slate-800 text-sm mt-1 leading-relaxed">
            {selectedChallenge.prompt}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-extrabold text-slate-400 block shrink-0 mr-1 uppercase">Vocabulário Recomendado:</span>
            {selectedChallenge.hints.map((hint) => (
              <span key={hint} className="text-[10px] bg-white border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md font-bold">
                {hint}
              </span>
            ))}
          </div>
        </div>

        {/* Challenge form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            rows={3}
            id="writing-input-textarea"
            disabled={loading}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={selectedChallenge.placeholder}
            className="w-full p-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-indigo-400 bg-white font-semibold text-slate-700 placeholder:text-slate-400 text-sm md:text-base leading-relaxed"
          />

          <button
            type="submit"
            id="writing-ai-submit"
            disabled={!inputText.trim() || loading}
            className="py-3 px-5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Corretor Mágico lendo sua frase...
              </span>
            ) : (
              <>
                Submeter ao Corretor Mágico <Sparkles className="w-4 h-4 animate-bounce" />
              </>
            )}
          </button>
        </form>

        {/* Structured Feedback result drawer */}
        {feedback && (
          <div className="mt-2 bg-gradient-to-r from-amber-50 to-amber-50/10 border-2 border-amber-200 rounded-2xl p-5 shadow-xs">
            
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-3xl">🧙‍♂️</span>
              <div>
                <h4 className="font-black text-slate-800 text-sm">Correção Mágica de IA</h4>
                <p className="text-[10px] font-bold text-amber-700 leading-tight">
                  Avaliado para o nível {getLevelTitle(getLevelAndProgress(profile.xp).level)}
                </p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-800 mt-3 leading-relaxed">{feedback.celebration}</p>

            {feedback.corrections && feedback.corrections.length > 0 && (
              <div className="mt-4 bg-white/70 p-4 rounded-xl border border-amber-200/50">
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> Dicas e Ajustes Gramaticais:
                </span>
                <ul className="list-disc pl-5 mt-2 text-xs font-bold text-slate-600 space-y-1">
                  {feedback.corrections.map((corr, idx) => (
                    <li key={idx} className="leading-relaxed">{corr}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Como um nativo diria:</span>
                <p className="font-extrabold text-sm text-indigo-600 mt-1">{feedback.improvedVersion}</p>
              </div>
              <button
                type="button"
                onClick={() => speakEnglish(feedback.improvedVersion)}
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-full text-indigo-600 transition-all border border-indigo-100 cursor-pointer"
                title="Ouvir pronúncia"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500 mt-4 leading-relaxed">
              💡 {feedback.explanation}
            </p>

            {completedList.includes(selectedId) && (
              <div className="mt-4 flex items-center gap-1.5 justify-center text-amber-500 font-extrabold text-xs bg-amber-50/50 border border-amber-200/50 py-2 rounded-xl">
                <Award className="w-4 h-4" />
                <span>+40 XP RECOMPENSA DE ESCRITA ADICIONADA!</span>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
