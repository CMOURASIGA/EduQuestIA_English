import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, AvatarType, AgeGroupType } from "../types";
import { 
  Sparkles, ArrowRight, ArrowLeft, Volume2, Check, Star, Award, 
  Shield, Info, HelpCircle, Eye, EyeOff, Lock, User, Plus, LogIn, 
  Key, X, AlertCircle 
} from "lucide-react";
import { getLevelAndProgress } from "../utils/levels";
import { toIsoDate } from "../utils/streak";

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

const PLAYER_EMOJIS = [
  // Kids / Fofos (até 9 anos)
  { emoji: "🧸", label: "Ursinho", type: "kids" },
  { emoji: "🦄", label: "Unicórnio", type: "kids" },
  { emoji: "🦖", label: "Dinossauro", type: "kids" },
  { emoji: "🚀", label: "Foguete", type: "kids" },
  { emoji: "🦁", label: "Leão", type: "kids" },
  { emoji: "🐼", label: "Panda", type: "kids" },
  { emoji: "🍦", label: "Sorvete", type: "kids" },
  { emoji: "🌈", label: "Arco-íris", type: "kids" },
  // Teens / Descolados (10 a 15 anos)
  { emoji: "🎮", label: "Controle", type: "teens" },
  { emoji: "😎", label: "Estilo", type: "teens" },
  { emoji: "🎧", label: "Fones", type: "teens" },
  { emoji: "🛹", label: "Skate", type: "teens" },
  { emoji: "⚡", label: "Raio", type: "teens" },
  { emoji: "👾", label: "Alien", type: "teens" },
  { emoji: "💻", label: "Tech", type: "teens" },
  { emoji: "🤘", label: "Rock", type: "teens" }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  // Account List & Selection state
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [selectedAccount, setSelectedAccount] = useState<UserProfile | null>(null);
  const [enteredPassword, setEnteredPassword] = useState<string>("");
  const [showEnteredPassword, setShowEnteredPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Registration Multi-step Form State
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [credentialsSaved, setCredentialsSaved] = useState<boolean>(false);
  const [avatar, setAvatar] = useState<AvatarType>("bunny");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("🧸");
  const [ageGroup, setAgeGroup] = useState<AgeGroupType>("kids");
  const [goal, setGoal] = useState<string>("speak");
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  
  // Placement test state
  const [placementOption, setPlacementOption] = useState<"zero" | "test" | null>(null);
  const [placementStep, setPlacementStep] = useState<number>(0);
  const [placementAnswers, setPlacementAnswers] = useState<Record<number, string>>({});
  const [testScore, setTestScore] = useState<number>(0);
  const [nameError, setNameError] = useState<string>("");

  // Load accounts list on mount
  useEffect(() => {
    const stored = localStorage.getItem("playenglish_accounts");
    if (stored) {
      try {
        const parsed: UserProfile[] = JSON.parse(stored);
        setAccounts(parsed);
        // If there are no accounts, default directly to registration mode
        if (parsed.length === 0) {
          setIsRegistering(true);
        }
      } catch (err) {
        console.error("Erro ao ler contas:", err);
        setIsRegistering(true);
      }
    } else {
      setIsRegistering(true);
    }
  }, []);

  // Update recommended emoji based on input age
  useEffect(() => {
    const parsedAge = parseInt(age, 10);
    if (!isNaN(parsedAge)) {
      if (parsedAge <= 9) {
        setAgeGroup("kids");
        // default a kid emoji if current selection is teen
        if (PLAYER_EMOJIS.find(e => e.emoji === selectedEmoji)?.type === "teens") {
          setSelectedEmoji("🧸");
        }
      } else {
        setAgeGroup("teens");
        // default a teen emoji if current selection is kid
        if (PLAYER_EMOJIS.find(e => e.emoji === selectedEmoji)?.type === "kids") {
          setSelectedEmoji("🎮");
        }
      }
    }
  }, [age, selectedEmoji]);

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) return;
      if (!age.trim() || isNaN(parseInt(age, 10))) {
        setNameError("Por favor, insira uma idade válida (4 a 15 anos).");
        return;
      }
      const parsedAge = parseInt(age, 10);
      if (parsedAge < 4 || parsedAge > 16) {
        setNameError("A SpaceAcademy é recomendada para idades entre 4 e 16 anos!");
        return;
      }
      if (!password.trim()) {
        setNameError("Por favor, crie uma senha para proteger sua conta.");
        return;
      }
      if (!credentialsSaved) {
        setNameError("Antes de continuar, guarde o nome e a senha usados neste cadastro.");
        return;
      }

      // Check if name already exists
      const nameExists = accounts.some(acc => acc.displayName.toLowerCase().trim() === name.toLowerCase().trim());
      if (nameExists) {
        setNameError("Já existe uma conta com este nome neste aparelho! Use outro nome ou faça login.");
        return;
      }

      setNameError("");
    }
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
      profileEmoji: selectedEmoji,
      ageGroup,
      age: parseInt(age, 10),
      goal,
      dailyMinutes,
      xp: initialXp,
      streak: 1,
      lastActiveDate: toIsoDate(new Date()),
      completedLessons: [],
      vocabularyCount: 0,
      password: password.trim() // store password in profile
    };

    // Save newly created profile to lists
    const updatedAccounts = [...accounts, newProfile];
    localStorage.setItem("playenglish_accounts", JSON.stringify(updatedAccounts));
    
    // Set active profile and trigger parent callback
    onComplete(newProfile);
  };

  // Login Handler for existing accounts
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAccount) return;

    const accountPassword = selectedAccount.password || "";
    if (enteredPassword.trim() === accountPassword.trim()) {
      // Login successful!
      setLoginError("");
      onComplete(selectedAccount);
    } else {
      setLoginError("Senha incorreta! Tente de novo ou peça ajuda aos pais. 🐻");
    }
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
    <div className="min-h-screen bg-gradient-to-b from-[#e0f2fe] via-[#f0f9ff] to-white flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto select-none relative">
      
      {/* Wave decor */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0 opacity-40 pointer-events-none">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[80px]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55,12.18,81.43,18.51,146.29,34.1,215.36,68.86,321.39,56.44Z" fill="#bae6fd"></path>
        </svg>
      </div>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl border-4 border-sky-100 p-6 md:p-10 flex flex-col my-6"
        id="onboarding-card"
      >
        
        {/* ==================== LOGIN SCREEN ==================== */}
        {!isRegistering && accounts.length > 0 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-20 h-20 bg-sky-100 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
              🚀
            </div>
            <h1 className="text-3xl font-black text-sky-950 leading-tight mb-1">
              Quem está aprendendo hoje?
            </h1>
            <p className="text-slate-500 mb-8 font-semibold text-sm">
              Escolha seu perfil espacial para decolar ou crie uma nova conta!
            </p>

            {/* Account list grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg mb-8">
              {accounts.map((acc) => {
                const isSelected = selectedAccount?.id === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccount(acc);
                      setEnteredPassword("");
                      setLoginError("");
                    }}
                    className={`p-4 rounded-2xl border-3 flex flex-col items-center gap-2.5 transition-all text-center cursor-pointer ${
                      isSelected 
                        ? "border-sky-400 bg-sky-50 text-sky-900 scale-105 shadow-md" 
                        : "border-slate-100 bg-white hover:border-slate-200 text-slate-600 hover:scale-[1.02]"
                    }`}
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-sky-400 flex items-center justify-center text-4xl shadow-md">
                      {acc.profileEmoji || "🚀"}
                    </div>
                    <div>
                      <span className="font-black text-sm block truncate max-w-[120px]">{acc.displayName}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                        Lvl {getLevelAndProgress(acc.xp).level} • {acc.xp} XP
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Password input slide-down */}
            <AnimatePresence>
              {selectedAccount && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-left"
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-sky-500" /> Segurança do Astronauta
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(null)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      Insira a senha de <strong>{selectedAccount.displayName}</strong> para entrar e carregar todo seu progresso:
                    </p>

                    <div className="relative">
                      <input
                        type={showEnteredPassword ? "text" : "password"}
                        value={enteredPassword}
                        onChange={(e) => setEnteredPassword(e.target.value)}
                        placeholder="Insira sua senha..."
                        className="w-full pl-10 pr-12 py-3 bg-white border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors"
                        autoFocus
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowEnteredPassword(!showEnteredPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showEnteredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {loginError && (
                      <p className="text-xs text-red-500 font-extrabold flex items-center gap-1.5 bg-red-50 p-2.5 rounded-lg border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {loginError}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(null)}
                        className="px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-sky-100 cursor-pointer"
                      >
                        Entrar na Academia <LogIn className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Actions Row */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg justify-center items-center border-t border-slate-100 pt-6">
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setStep(1);
                  setName("");
                  setAge("");
                  setPassword("");
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Criar Novo Perfil
              </button>
              
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-indigo-500" /> Ajuda & Senha
              </button>
            </div>
          </div>
        )}

        {/* ==================== REGISTRATION SCREEN ==================== */}
        {isRegistering && (
          <div>
            {/* Header / Back Action */}
            <div className="flex justify-between items-center mb-6">
              {accounts.length > 0 ? (
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setNameError("");
                  }}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Escolher Conta existente
                </button>
              ) : (
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  Primeiro Acesso 🛰️
                </span>
              )}
              
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl flex items-center gap-1 transition-colors text-xs font-bold cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-indigo-500" /> Precisa de ajuda?
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-8">
              <div 
                className="bg-sky-400 h-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>

            {/* STEP 1: Basic registration (Name, Age & Password) */}
            {step === 1 && (
              <div className="flex flex-col items-center text-center animate-fade-in">
                <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center text-3xl mb-4 animate-bounce">
                  ✨
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-sky-950 leading-tight mb-2">
                  Criar seu Crachá Espacial!
                </h1>
                <p className="text-slate-500 mb-6 font-medium text-xs md:text-sm">
                  Complete os campos abaixo para guardarmos todo seu progresso de forma segura.
                </p>

                <div className="w-full max-w-md space-y-4 text-left">
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Seu Nome ou Apelido 🧑‍🚀
                    </label>
                    <input
                      type="text"
                        value={name}
                      onChange={(e) => {
                        setName(e.target.value.slice(0, 20));
                        setCredentialsSaved(false);
                      }}
                      placeholder="Como quer ser chamado?"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors"
                    />
                  </div>

                  {/* Row for Age & Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Age field */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        Sua Idade (4 a 16) 🎂
                      </label>
                      <input
                        type="number"
                        min="4"
                        max="16"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Quantos anos tem?"
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors"
                      />
                    </div>

                    {/* Password field */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                        Crie uma Senha Secreta 🔒
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value.slice(0, 15));
                            setCredentialsSaved(false);
                          }}
                          placeholder="Ex: 1234 ou bola"
                          className="w-full pl-4 pr-10 py-3 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning on name/age error */}
                  {nameError && (
                    <div className="text-xs text-red-500 font-extrabold flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {nameError}
                    </div>
                  )}

                  {/* Credential and storage warning */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5 flex gap-2.5 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-xs text-amber-950 block">Guarde seu nome e sua senha</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                        Anote ou peça para um responsável guardar o nome e a senha exatamente como foram escritos. Sem eles, não será possível entrar neste perfil e você poderá ter de criar outro, começando o progresso novamente.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={credentialsSaved}
                      onChange={(e) => setCredentialsSaved(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-indigo-600"
                    />
                    <span className="text-[11px] font-bold leading-relaxed text-indigo-950">
                      Já guardei o meu nome e a minha senha. Sei que o progresso fica somente neste navegador e aparelho.
                    </span>
                  </label>
                </div>

                <div className="mt-8 w-full flex justify-end max-w-md">
                  <button
                    type="button"
                    disabled={!name.trim() || !age.trim() || !password.trim() || !credentialsSaved}
                    onClick={handleNext}
                    className="w-full py-4 px-6 bg-sky-400 hover:bg-sky-500 disabled:bg-slate-200 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed text-lg"
                  >
                    Definir Aparência <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Choose Mascot & Emoji */}
            {step === 2 && (
              <div className="flex flex-col items-center animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-1">
                  Seu Emoji de Astronauta 🌟
                </h1>
                <p className="text-slate-500 text-center mb-4 font-bold text-xs uppercase tracking-wider">
                  {ageGroup === "kids" ? "🧸 Recomendados para crianças (mais fofos)" : "⚡ Recomendados para adolescentes (mais descolados)"}
                </p>

                {/* Interactive Grid of Emojis */}
                <div className="grid grid-cols-8 gap-2 w-full max-w-md mb-6 bg-slate-50 p-3.5 rounded-[24px] border border-slate-100">
                  {PLAYER_EMOJIS.map((item) => {
                    const isSelected = selectedEmoji === item.emoji;
                    const isRecommended = item.type === ageGroup;
                    return (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(item.emoji)}
                        className={`w-10 h-10 md:w-11 md:h-11 text-2xl rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                          isSelected 
                            ? "bg-sky-400 text-white scale-110 shadow-md ring-2 ring-sky-300" 
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-100"
                        }`}
                        title={item.label}
                      >
                        <span>{item.emoji}</span>
                        {isRecommended && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <h1 className="text-xl md:text-2xl font-black text-sky-950 text-center mb-1">
                  Escolha seu Companheiro de Estudos!
                </h1>
                <p className="text-slate-500 text-center mb-5 font-medium text-xs">
                  Ele guiará suas lições, conversas com Tutor e te dará boas-vindas na SpaceAcademy!
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-6">
                  {AVATARS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
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
                      <span className="text-4xl md:text-5xl animate-pulse">{item.icon}</span>
                      <span className="font-extrabold text-xs">{item.name}</span>
                    </button>
                  ))}
                </div>

                {/* Speak line box */}
                {selectedAvatarObj && (
                  <div className="w-full max-w-lg bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
                    <span className="text-3xl mt-1">{selectedAvatarObj.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-950 text-xs">{selectedAvatarObj.name}</h4>
                      <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">{selectedAvatarObj.desc}</p>
                      <button
                        type="button"
                        onClick={() => playVoice(selectedAvatarObj.voiceLine)}
                        className="mt-2 py-1 px-2.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" /> Ouvir Voz dele
                      </button>
                    </div>
                  </div>
                )}

                {/* Previews badge Card */}
                <div className="w-full max-w-md mb-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-0.5 rounded-2xl shadow-md">
                  <div className="bg-white rounded-[14px] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-2xl select-none border border-purple-200">
                        {selectedEmoji}
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black text-purple-600 uppercase block leading-none">Perfil Preparado</span>
                        <span className="text-sm font-black text-slate-800">{name || "Seu Nome"}</span>
                      </div>
                    </div>
                    <div className="bg-indigo-100 text-indigo-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                      {ageGroup === "kids" ? "Nível Kids 🧸" : "Nível Teen ⚡"}
                    </div>
                  </div>
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
                    onClick={handleNext}
                    className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
                  >
                    Gostei desse! <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Goals */}
            {step === 3 && (
              <div className="flex flex-col items-center animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
                  Qual é o seu objetivo? 🎯
                </h1>
                <p className="text-slate-500 text-center mb-8 font-medium text-xs">
                  A SpaceAcademy irá personalizar as dicas de acordo com o seu foco principal!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
                  {[
                    { id: "speak", icon: "💬", title: "Conversar à vontade", desc: "Falar inglês com muita confiança!" },
                    { id: "school", icon: "🏫", title: "Ir bem na escola", desc: "Tirar notas excelentes em inglês!" },
                    { id: "games", icon: "🎮", title: "Jogos & Vídeos", desc: "Entender lives de games, músicas e vídeos!" },
                    { id: "travel", icon: "✈️", title: "Viajar o mundo", desc: "Conversar em viagens e passeios!" }
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
                    onClick={handleNext}
                    className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
                  >
                    Avançar <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Daily learning time */}
            {step === 4 && (
              <div className="flex flex-col items-center animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
                  Meta Diária de Aprendizado ⏱️
                </h1>
                <p className="text-slate-500 text-center mb-8 font-medium text-xs">
                  Estudar um pouquinho por dia garante que você não esqueça os novos termos!
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
                          <span className="text-xs text-slate-400">Meta diária</span>
                        </div>
                      </div>
                      <span className="font-black text-sky-500 text-base">{item.min} minutos / dia</span>
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
                    onClick={handleNext}
                    className="flex-1 py-4 px-6 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
                  >
                    Avançar <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Start method / Level Quiz */}
            {step === 5 && placementStep === 0 && (
              <div className="flex flex-col items-center animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-black text-sky-950 text-center mb-2">
                  Como você quer começar? 🚀
                </h1>
                <p className="text-slate-500 text-center mb-8 font-medium text-xs">
                  Selecione começar do absoluto zero ou teste seus conhecimentos no quiz rápido de bônus!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
                  <button
                    type="button"
                    onClick={() => setPlacementOption("zero")}
                    className={`p-6 rounded-2xl border-3 flex flex-col items-center gap-3 text-center transition-all cursor-pointer ${
                      placementOption === "zero" 
                        ? "border-emerald-400 bg-emerald-50 text-emerald-950 scale-102 shadow-sm" 
                        : "border-slate-100 bg-white hover:border-slate-200 text-slate-600"
                    }`}
                  >
                    <span className="text-4xl animate-bounce">🌱</span>
                    <span className="font-black text-sm text-sky-950">Começar do absoluto Zero</span>
                    <span className="text-[11px] text-slate-500 leading-relaxed">
                      Perfeito para quem está aprendendo as primeiras palavrinhas. Vamos devagar!
                    </span>
                  </button>

                  <button
                    type="button"
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
                    <span className="font-black text-sm text-sky-950">Fazer Quiz de Nível</span>
                    <span className="text-[11px] text-slate-500 leading-relaxed">
                      Acerte 3 perguntinhas de inglês e ganhe bônus de XP instantâneo!
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
                      onClick={() => handleFinish(0)}
                      className="flex-1 py-4 px-6 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg text-lg"
                    >
                      Entrar no Universo! <Sparkles className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5b: Placement Test Questions */}
            {step === 5 && placementStep > 0 && placementStep <= testQuestions.length && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="flex justify-between items-center w-full max-w-md mb-4 text-xs font-bold text-slate-400">
                  <span>QUIZ RÁPIDO DE INGLÊS</span>
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
                        className={`p-4 rounded-xl border-2 text-left font-bold text-sm transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? "border-sky-400 bg-sky-50 text-sky-900" 
                            : "border-slate-100 hover:border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <Volume2 className="w-4 h-4 text-sky-500 animate-pulse" />}
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
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
                  >
                    Voltar
                  </button>

                  {placementStep < testQuestions.length ? (
                    <button
                      type="button"
                      disabled={!placementAnswers[placementStep - 1]}
                      onClick={() => setPlacementStep((prev) => prev + 1)}
                      className="flex-1 py-3 px-5 bg-sky-400 hover:bg-sky-500 disabled:bg-slate-200 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Próxima <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!placementAnswers[placementStep - 1]}
                      onClick={submitPlacementTest}
                      className="flex-1 py-3 px-5 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 text-slate-900 font-extrabold rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Finalizar e Ver XP <Award className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5c: Placement Test Results */}
            {step === 5 && placementStep === 99 && (
              <div className="flex flex-col items-center text-center animate-fade-in">
                <span className="text-6xl mb-4">🏆</span>
                <h1 className="text-2xl md:text-3xl font-black text-sky-950">
                  Excelente Trabalho!
                </h1>
                <p className="text-slate-500 font-bold text-sm mt-1">
                  Você completou o quiz com {testScore} de {testQuestions.length} acertos!
                </p>

                <div className="my-6 p-5 bg-sky-50 border-2 border-sky-100 rounded-2xl w-full max-w-md">
                  <div className="flex items-center gap-2 justify-center text-amber-500 font-extrabold text-base">
                    <Star className="fill-amber-400 stroke-amber-500 w-5 h-5 animate-spin" />
                    <span>+ {testScore * 50} BÔNUS DE XP!</span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-medium mt-2 leading-relaxed">
                    Parabéns! Suas respostas garantiram bônus para sua trilha espacial. Vamos voar juntos!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleFinish(testScore * 50)}
                  className="w-full max-w-md py-4 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  Entrar na SpaceAcademy! <Sparkles className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

      </motion.div>

      {/* ==================== HELP & SAFETY MODAL ==================== */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border-4 border-indigo-100 max-h-[85vh] flex flex-col relative"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white flex justify-between items-center relative shrink-0">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-white" />
                  <h3 className="font-black text-lg tracking-tight">Ajuda & Segurança</h3>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
                
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    💾 Aonde fica salvo meu progresso?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Todo seu progresso, estrelas, conquistas e revisões de vocabulário são guardados de forma <strong>offline</strong> no armazenamento interno (<code>localStorage</code>) deste navegador.
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    💻 Se eu mudar de aparelho, o que acontece?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Como não utilizamos cadastro em nuvem ou e-mails para garantir 100% da privacidade de crianças e adolescentes, se você mudar de computador ou celular, você precisará <strong>criar um novo cadastro lá</strong>. O progresso é exclusivo de cada aparelho!
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    🔒 Por que preciso criar uma Senha Secreta?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A senha serve para <strong>proteger a sua conta</strong> neste mesmo computador ou tablet. Assim, se houver outras crianças, irmãos ou amigos jogando no mesmo aparelho, ninguém conseguirá mexer na sua trilha ou apagar suas ofensivas por engano!
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    📝 Posso usar o mesmo nome de um perfil antigo?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Se você já tem uma conta cadastrada no aparelho e colocar o mesmo nome, o sistema avisará que o nome já existe. Basta cancelar o cadastro e fazer login digitando sua senha secreta para recuperar tudo de onde parou!
                  </p>
                </div>

              </div>

              {/* Footer Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-5 py-2.5 bg-[#1A1C3D] hover:bg-[#282B5C] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Entendido, obrigado!
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
