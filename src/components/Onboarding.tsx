import React, { useState } from "react";
import { motion } from "motion/react";
import { UserProfile, AvatarType, AgeGroupType } from "../types";
import { Sparkles, ArrowRight, ArrowLeft, Volume2, Check, Star, Award } from "lucide-react";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const AVATARS: { id: AvatarType; name: string; icon: string; desc: string; voiceLine: string }[] = [
  { id: "bunny", name: "Pip", icon: "🐰", desc: "Um coelhinho muito curioso que adora pular e aprender palavras novas!", voiceLine: "Hi there! I am Pip. Let's learn English together!" },
  { id: "bear", name: "Barnaby", icon: "🐻", desc: "Um ursinho muito inteligente que ama mel e sabe tirar todas as dúvidas!", voiceLine: "Hello! I am Barnaby. Learning is super fun!" },
  { id: "fox", name: "Fiona", icon: "🦊", desc: "Uma raposinha esperta que conhece piadas incríveis e dicas de escrita!", voiceLine: "Hey buddy! I am Fiona. Ready for a big English adventure?" },
  { id: "lion", name: "Leo", icon: "🦁", desc: "Um leãozinho corajoso e animado que te enche de energia positiva!", voiceLine: "Roar! I am Leo. You are going to be a superstar in English!" }
];

const playVoice = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<AvatarType>("bunny");
  const [ageGroup, setAgeGroup] = useState<AgeGroupType>("kids");
  const [goal, setGoal] = useState<string>("speak");
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  
  // Placement test state
  const [placementOption, setPlacementOption] = useState<"zero" | "test" | null>(null);
  const [placementStep, setPlacementStep] = useState<number>(0);
  const [placementAnswers, setPlacementAnswers] = useState<Record<number, string>>({});
  const [testScore, setTestScore] = useState<number>(0);

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleFinish = (initialXp: number = 0) => {
    const newProfile: UserProfile = {
      id: Math.random().toString(36).substring(7),
      displayName: name.trim(),
      avatar,
      ageGroup,
      goal,
      dailyMinutes,
      xp: initialXp,
      streak: 1,
      lastActiveDate: new Date().toLocaleDateString(),
      completedLessons: [],
      vocabularyCount: 0
    };
    onComplete(newProfile);
  };

  // Mini Placement Test Questions
  const testQuestions = [
    {
      q: "Qual dessas opções significa 'Bom dia'?",
      options: ["Good morning", "Good night", "Goodbye"],
      correct: "Good morning",
      audio: "Good morning"
    },
    {
      q: "Como se diz 'cachorro' em inglês?",
      options: ["Cat", "Dog", "Bird"],
      correct: "Dog",
      audio: "Dog"
    },
    {
      q: "Qual a cor do sol (Amarelo) em inglês?",
      options: ["Blue", "Yellow", "Red"],
      correct: "Yellow",
      audio: "Yellow"
    }
  ];

  const handleAnswerTest = (index: number, option: string) => {
    setPlacementAnswers({ ...placementAnswers, [index]: option });
    playVoice(testQuestions[index].audio);
  };

  const submitPlacementTest = () => {
    let score = 0;
    testQuestions.forEach((q, idx) => {
      if (placementAnswers[idx] === q.correct) {
        score += 1;
      }
    });
    setTestScore(score);
    setPlacementStep(99); // Show test results
  };

  const selectedAvatarObj = AVATARS.find((a) => a.id === avatar);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e0f2fe] via-[#f0f9ff] to-white flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden select-none">
      
      {/* Wave decor */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0 opacity-40">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[80px]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55,12.18,81.43,18.51,146.29,34.1,215.36,68.86,321.39,56.44Z" fill="#bae6fd"></path>
        </svg>
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border-4 border-sky-100 p-6 md:p-10 flex flex-col"
        id="onboarding-card"
      >
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-8">
          <div 
            className="bg-sky-400 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* STEP 1: Name and Age Group */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center text-4xl mb-4 animate-bounce">
              🎈
            </div>
            <h1 className="text-3xl font-black text-sky-950 leading-tight mb-2">
              Bem-vindo ao seu Portal de Inglês!
            </h1>
            <p className="text-slate-500 mb-6 font-medium text-sm md:text-base">
              Vamos começar uma aventura incrível! Qual é o seu nome?
            </p>

            <input
              type="text"
              id="onboarding-name-input"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 25))}
              placeholder="Digite seu nome ou apelido..."
              className="w-full max-w-md px-6 py-4 text-center text-xl font-bold bg-sky-50/50 border-2 border-sky-200 rounded-2xl outline-none focus:border-sky-400 focus:bg-sky-50 text-slate-800 transition-all placeholder:text-slate-400"
            />

            <h2 className="text-xl font-extrabold text-sky-950 mt-8 mb-4">
              Quantos anos você tem?
            </h2>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button
                type="button"
                id="age-kids-btn"
                onClick={() => setAgeGroup("kids")}
                className={`p-4 rounded-2xl border-3 font-black text-base flex flex-col items-center gap-2 transition-all ${
                  ageGroup === "kids" 
                    ? "border-sky-400 bg-sky-50 text-sky-700 scale-[1.03] shadow-md" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-3xl">🧸</span>
                <span>Até 9 anos</span>
                <span className="text-xs font-medium text-slate-400">Kids</span>
              </button>
              
              <button
                type="button"
                id="age-teens-btn"
                onClick={() => setAgeGroup("teens")}
                className={`p-4 rounded-2xl border-3 font-black text-base flex flex-col items-center gap-2 transition-all ${
                  ageGroup === "teens" 
                    ? "border-sky-400 bg-sky-50 text-sky-700 scale-[1.03] shadow-md" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-3xl">🎮</span>
                <span>10 a 15 anos</span>
                <span className="text-xs font-medium text-slate-400">Teens</span>
              </button>
            </div>

            <div className="mt-8 w-full flex justify-end max-w-md">
              <button
                type="button"
                id="next-step-1"
                disabled={!name.trim()}
                onClick={handleNext}
                className="w-full py-4 px-6 bg-sky-400 hover:bg-sky-500 disabled:bg-slate-200 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed text-lg"
              >
                Continuar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Avatar Companion */}
        {step === 2 && (
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-1">
              Escolha seu Companheiro de Estudos!
            </h1>
            <p className="text-slate-500 text-center mb-6 font-medium text-sm">
              Ele vai te ajudar em todas as lições, tirar dúvidas e conversar com você!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-6">
              {AVATARS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  id={`avatar-${item.id}-btn`}
                  onClick={() => {
                    setAvatar(item.id);
                    playVoice(item.voiceLine);
                  }}
                  className={`p-4 rounded-2xl border-3 flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                    avatar === item.id 
                      ? "border-amber-400 bg-amber-50/50 text-amber-900 scale-105 shadow-md" 
                      : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="text-5xl animate-pulse">{item.icon}</span>
                  <span className="font-extrabold text-sm">{item.name}</span>
                </button>
              ))}
            </div>

            {/* Avatar description speech bubble */}
            {selectedAvatarObj && (
              <div className="w-full max-w-lg bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-8">
                <span className="text-3xl mt-1">{selectedAvatarObj.icon}</span>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-950 text-sm">{selectedAvatarObj.name}</h4>
                  <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">{selectedAvatarObj.desc}</p>
                  <button
                    type="button"
                    onClick={() => playVoice(selectedAvatarObj.voiceLine)}
                    className="mt-2 py-1 px-2.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Ouvir Voz dele
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 w-full max-w-lg">
              <button
                type="button"
                onClick={handleBack}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> Voltar
              </button>
              <button
                type="button"
                id="next-step-2"
                onClick={handleNext}
                className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
              >
                Gostei deste! <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Goals */}
        {step === 3 && (
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
              Qual é o seu objetivo? 🎯
            </h1>
            <p className="text-slate-500 text-center mb-8 font-medium text-sm">
              Vamos adaptar o inglês ao que você mais quer fazer!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
              {[
                { id: "speak", icon: "💬", title: "Conversar à vontade", desc: "Falar inglês com confiança!" },
                { id: "school", icon: "🏫", title: "Ir muito bem na escola", desc: "Tirar notas 10 em todas as provas!" },
                { id: "games", icon: "🎮", title: "Jogar e assistir vídeos", desc: "Entender lives, jogos e músicas!" },
                { id: "travel", icon: "✈️", title: "Viajar o mundo", desc: "Se comunicar em hotéis, passeios e aeroportos!" }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGoal(item.id)}
                  className={`p-4 rounded-2xl border-3 flex items-center gap-4 text-left transition-all cursor-pointer ${
                    goal === item.id 
                      ? "border-sky-400 bg-sky-50 text-sky-900 scale-[1.01] shadow-sm" 
                      : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <h3 className="font-black text-sm text-sky-950">{item.title}</h3>
                    <p className="text-slate-500 text-xs font-medium">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4 w-full max-w-lg">
              <button
                type="button"
                onClick={handleBack}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> Voltar
              </button>
              <button
                type="button"
                id="next-step-3"
                onClick={handleNext}
                className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
              >
                Avançar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Daily Meta Minutes */}
        {step === 4 && (
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
              Meta Diária de Aprendizado ⏱️
            </h1>
            <p className="text-slate-500 text-center mb-8 font-medium text-sm">
              Um pouquinho por dia faz uma mágica enorme! Quanto tempo quer estudar?
            </p>

            <div className="flex flex-col gap-4 w-full max-w-md mb-8">
              {[
                { min: 5, label: "Super Leve", icon: "🌱" },
                { min: 10, label: "Recomendado", icon: "⭐" },
                { min: 20, label: "Super Estudioso", icon: "🔥" }
              ].map((item) => (
                <button
                  key={item.min}
                  type="button"
                  onClick={() => setDailyMinutes(item.min)}
                  className={`p-4 rounded-2xl border-3 flex items-center justify-between transition-all cursor-pointer ${
                    dailyMinutes === item.min 
                      ? "border-sky-400 bg-sky-50 text-sky-950 scale-[1.02] shadow-sm" 
                      : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <span className="font-extrabold text-sm block">{item.label}</span>
                      <span className="text-xs text-slate-400">Duração curta de treino</span>
                    </div>
                  </div>
                  <span className="font-black text-sky-500 text-lg">{item.min} minutos / dia</span>
                </button>
              ))}
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <button
                type="button"
                onClick={handleBack}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> Voltar
              </button>
              <button
                type="button"
                id="next-step-4"
                onClick={handleNext}
                className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
              >
                Avançar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Start Option / Placement Test */}
        {step === 5 && placementStep === 0 && (
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
              Como você quer começar? 🚀
            </h1>
            <p className="text-slate-500 text-center mb-8 font-medium text-sm">
              Você pode começar do absoluto zero ou fazer um pequeno teste divertido para testar o que já sabe!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
              <button
                type="button"
                id="start-zero-btn"
                onClick={() => setPlacementOption("zero")}
                className={`p-6 rounded-2xl border-3 flex flex-col items-center gap-3 text-center transition-all cursor-pointer ${
                  placementOption === "zero" 
                    ? "border-emerald-400 bg-emerald-50 text-emerald-950 scale-102 shadow-sm" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-4xl">🌱</span>
                <span className="font-black text-base text-sky-950">Começar do absoluto Zero</span>
                <span className="text-xs text-slate-500 leading-relaxed">
                  Perfeito para quem nunca estudou inglês. Vamos juntos passo a passo!
                </span>
              </button>

              <button
                type="button"
                id="start-test-btn"
                onClick={() => {
                  setPlacementOption("test");
                  setPlacementStep(1); // Go to question 1
                }}
                className={`p-6 rounded-2xl border-3 flex flex-col items-center gap-3 text-center transition-all cursor-pointer ${
                  placementOption === "test" 
                    ? "border-sky-400 bg-sky-50 text-sky-950 scale-102 shadow-sm" 
                    : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-4xl">⭐</span>
                <span className="font-black text-base text-sky-950">Fazer Teste de Nível</span>
                <span className="text-xs text-slate-500 leading-relaxed">
                  Teste seu nível básico de inglês em 3 questõezinhas lúdicas e ganhe bônus!
                </span>
              </button>
            </div>

            <div className="flex gap-4 w-full max-w-lg">
              <button
                type="button"
                onClick={handleBack}
                className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" /> Voltar
              </button>
              
              {placementOption === "zero" && (
                <button
                  type="button"
                  id="finish-onboarding-zero"
                  onClick={() => handleFinish(0)}
                  className="flex-1 py-4 px-6 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
                >
                  Começar Minha Viagem! <Sparkles className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 5b: Placement Test Questions */}
        {step === 5 && placementStep > 0 && placementStep <= testQuestions.length && (
          <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full max-w-md mb-4 text-xs font-bold text-slate-400">
              <span>TESTE DIVERTIDO DE INGLÊS</span>
              <span>Questão {placementStep} de {testQuestions.length}</span>
            </div>

            <h2 className="text-xl font-black text-sky-950 text-center mb-6">
              {testQuestions[placementStep - 1].q}
            </h2>

            <div className="flex flex-col gap-3 w-full max-w-md mb-8">
              {testQuestions[placementStep - 1].options.map((option) => {
                const isSelected = placementAnswers[placementStep - 1] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAnswerTest(placementStep - 1, option)}
                    className={`p-4 rounded-xl border-2 text-left font-bold text-sm transition-all flex items-center justify-between ${
                      isSelected 
                        ? "border-sky-400 bg-sky-50 text-sky-900" 
                        : "border-slate-100 hover:border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && <Volume2 className="w-4 h-4 text-sky-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  if (placementStep === 1) {
                    setPlacementStep(0);
                    setPlacementOption(null);
                  } else {
                    setPlacementStep((prev) => prev - 1);
                  }
                }}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Voltar
              </button>

              {placementStep < testQuestions.length ? (
                <button
                  type="button"
                  disabled={!placementAnswers[placementStep - 1]}
                  onClick={() => setPlacementStep((prev) => prev + 1)}
                  className="flex-1 py-3 px-5 bg-sky-400 hover:bg-sky-501 disabled:bg-slate-200 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5"
                >
                  Próxima <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!placementAnswers[placementStep - 1]}
                  onClick={submitPlacementTest}
                  className="flex-1 py-3 px-5 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 text-slate-900 font-extrabold rounded-xl text-sm flex items-center justify-center gap-1.5"
                >
                  Ver Meu Resultado! <Award className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 5c: Placement Test Results */}
        {step === 5 && placementStep === 99 && (
          <div className="flex flex-col items-center text-center">
            <span className="text-6xl mb-4">🏆</span>
            <h1 className="text-2xl md:text-3xl font-black text-sky-950">
              Excelente Trabalho!
            </h1>
            <p className="text-slate-500 font-bold text-sm mt-1">
              Você completou o teste com {testScore} de {testQuestions.length} acertos!
            </p>

            <div className="my-6 p-5 bg-sky-50 border-2 border-sky-100 rounded-2xl max-w-md">
              <div className="flex items-center gap-2 justify-center text-amber-500 font-extrabold text-base">
                <Star className="fill-amber-400 stroke-amber-500 w-5 h-5 animate-spin" />
                <span>+ {testScore * 50} BÔNUS DE XP!</span>
              </div>
              <p className="text-slate-600 text-xs font-medium mt-2 leading-relaxed">
                Parabéns! Suas respostas mostram que você já conhece alguns vocabulários básicos. Vamos começar sua trilha com moedas de XP extras!
              </p>
            </div>

            <button
              type="button"
              id="finish-onboarding-test"
              onClick={() => handleFinish(testScore * 50)}
              className="w-full max-w-md py-4 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              Começar Minha Viagem! <Sparkles className="w-5 h-5" />
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
