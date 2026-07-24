/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, Lesson, VocabularyItem, AgeGroupType } from "./types";
import { INITIAL_LESSONS, INITIAL_VOCABULARY } from "./data";
import Onboarding from "./components/Onboarding";
import LessonScreen from "./components/LessonScreen";
import TutorChat from "./components/TutorChat";
import AdminPanel from "./components/AdminPanel";
import VocabularyTrainer from "./components/VocabularyTrainer";
import WritingChallenge from "./components/WritingChallenge";
import JourneyGuide from "./components/JourneyGuide";
import { getLevelAndProgress, getLevelTitle } from "./utils/levels";
import { 
  Sparkles, BookOpen, MessageSquare, Flame, LogOut, 
  Settings, PenTool, Home, Star, Play, Lock, CheckCircle2, Award,
  Edit3, Key, X, Check, Save, User, Eye, EyeOff, AlertCircle, Heart, Info, Clipboard, Upload,
  ShoppingBag
} from "lucide-react";
import SupportModal from "./components/support/SupportModal";
import SupporterBadge from "./components/support/SupporterBadge";
import SupportEntryCard from "./components/support/SupportEntryCard";
import SpaceShopModal from "./components/support/SpaceShopModal";
import SpaceShopCard from "./components/support/SpaceShopCard";
import { isSupporterActive, exportAllData, importAllData } from "./services/supportStorage";
import { getUnlockedEmojis } from "./services/shopStorage";
import { ShopItem } from "./types/shop";
import { logTelemetryEvent } from "./services/telemetryService";

export default function App() {
  // Core Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Custom lessons from localStorage or default static
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Vocabulary state
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  
  // App visual states
  const [activeTab, setActiveTab] = useState<"trilha" | "vocabulario" | "tutor" | "escrita" | "loja" | "admin">("trilha");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Support / Pix Modal state
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supporterActive, setSupporterActive] = useState(false);

  // Space Shop Modal state
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);

  // State to force re-render components that check supporter status
  const syncSupportStatus = () => {
    setSupporterActive(isSupporterActive());
  };

  useEffect(() => {
    syncSupportStatus();
  }, [profile]);

  // Edit Profile form states
  const [editedName, setEditedName] = useState("");
  const [editedEmoji, setEditedEmoji] = useState("🚀");
  const [editedAgeGroup, setEditedAgeGroup] = useState<AgeGroupType>("kids");
  const [editedPassword, setEditedPassword] = useState("");
  const [showEditedPassword, setShowEditedPassword] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Initialize edit profile form when opened
  useEffect(() => {
    if (showEditProfile && profile) {
      setEditedName(profile.displayName);
      setEditedEmoji(profile.profileEmoji || "🚀");
      setEditedAgeGroup(profile.ageGroup || "kids");
      setEditedPassword(profile.password || "");
      setShowEditedPassword(false);
      setEditError("");
      setEditSuccess(false);
    }
  }, [showEditProfile, profile]);

  // Initialize data on load
  useEffect(() => {
    // 1. Get active profile
    const storedProfile = localStorage.getItem("playenglish_profile");
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (err) {
        console.error("Erro ao ler perfil ativo:", err);
      }
    }
  }, []);

  // Synchronize lessons and vocabulary whenever the profile changes
  useEffect(() => {
    if (!profile) return;

    // Load user-specific lessons
    const userLessonsKey = `playenglish_lessons_${profile.id}`;
    const storedLessons = localStorage.getItem(userLessonsKey);
    if (storedLessons) {
      try {
        setLessons(JSON.parse(storedLessons));
      } catch (err) {
        setLessons(INITIAL_LESSONS);
      }
    } else {
      // Fallback to legacy generic key if exists, or INITIAL_LESSONS
      const legacyLessons = localStorage.getItem("playenglish_lessons");
      if (legacyLessons) {
        try {
          const parsed = JSON.parse(legacyLessons);
          setLessons(parsed);
          localStorage.setItem(userLessonsKey, JSON.stringify(parsed));
        } catch {
          setLessons(INITIAL_LESSONS);
          localStorage.setItem(userLessonsKey, JSON.stringify(INITIAL_LESSONS));
        }
      } else {
        setLessons(INITIAL_LESSONS);
        localStorage.setItem(userLessonsKey, JSON.stringify(INITIAL_LESSONS));
      }
    }

    // Load user-specific vocabulary
    const userVocabKey = `playenglish_vocabulary_${profile.id}`;
    const storedVocab = localStorage.getItem(userVocabKey);
    if (storedVocab) {
      try {
        setVocabulary(JSON.parse(storedVocab));
      } catch (err) {
        setVocabulary(INITIAL_VOCABULARY);
      }
    } else {
      // Fallback to legacy generic key if exists, or INITIAL_VOCABULARY
      const legacyVocab = localStorage.getItem("playenglish_vocabulary");
      if (legacyVocab) {
        try {
          const parsed = JSON.parse(legacyVocab);
          setVocabulary(parsed);
          localStorage.setItem(userVocabKey, JSON.stringify(parsed));
        } catch {
          setVocabulary(INITIAL_VOCABULARY);
          localStorage.setItem(userVocabKey, JSON.stringify(INITIAL_VOCABULARY));
        }
      } else {
        setVocabulary(INITIAL_VOCABULARY);
        localStorage.setItem(userVocabKey, JSON.stringify(INITIAL_VOCABULARY));
      }
    }
  }, [profile?.id]);

  // Save profile helper
  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem("playenglish_profile", JSON.stringify(newProfile));

    // Update inside accounts list
    const stored = localStorage.getItem("playenglish_accounts");
    if (stored) {
      try {
        const accounts: UserProfile[] = JSON.parse(stored);
        const idx = accounts.findIndex(a => a.id === newProfile.id);
        if (idx !== -1) {
          accounts[idx] = newProfile;
          localStorage.setItem("playenglish_accounts", JSON.stringify(accounts));
        } else {
          accounts.push(newProfile);
          localStorage.setItem("playenglish_accounts", JSON.stringify(accounts));
        }
      } catch (err) {
        console.error("Erro ao atualizar conta na lista:", err);
      }
    } else {
      localStorage.setItem("playenglish_accounts", JSON.stringify([newProfile]));
    }
  };

  // Save lessons helper
  const handleUpdateLessons = (updated: Lesson[]) => {
    setLessons(updated);
    if (profile) {
      localStorage.setItem(`playenglish_lessons_${profile.id}`, JSON.stringify(updated));
    } else {
      localStorage.setItem("playenglish_lessons", JSON.stringify(updated));
    }
  };

  // Reset lessons helper
  const handleResetLessons = () => {
    if (confirm("Quer mesmo restaurar todas as lições para o modelo original? Isso apagará seus exercícios customizados.")) {
      setLessons(INITIAL_LESSONS);
      if (profile) {
        localStorage.setItem(`playenglish_lessons_${profile.id}`, JSON.stringify(INITIAL_LESSONS));
      } else {
        localStorage.setItem("playenglish_lessons", JSON.stringify(INITIAL_LESSONS));
      }
    }
  };

  // Update vocabulary list helper
  const handleUpdateVocabulary = (updated: VocabularyItem[]) => {
    setVocabulary(updated);
    if (profile) {
      localStorage.setItem(`playenglish_vocabulary_${profile.id}`, JSON.stringify(updated));
      saveProfile({ ...profile, vocabularyCount: updated.length });
    } else {
      localStorage.setItem("playenglish_vocabulary", JSON.stringify(updated));
    }
  };

  const handleAddVocabularyWord = (word: Omit<VocabularyItem, "id" | "learnedAt">) => {
    const newItem: VocabularyItem = {
      ...word,
      id: "vocab-" + Math.random().toString(36).substring(7),
      learnedAt: new Date().toISOString()
    };
    const updated = [...vocabulary, newItem];
    handleUpdateVocabulary(updated);
  };

  // Handle lesson completion rewards
  const recordLessonCompletion = (wordsLearned: any[]) => {
    if (!profile || !activeLessonId) return;

    // Check if first completion to add streak
    const hasCompletedBefore = profile.completedLessons.includes(activeLessonId);
    const updatedCompleted = hasCompletedBefore 
      ? profile.completedLessons 
      : [...profile.completedLessons, activeLessonId];

    // Add learned words to vocabulary automatically (RF-008, RF-009)
    let updatedVocab = [...vocabulary];
    wordsLearned.forEach((w) => {
      if (!updatedVocab.some(existing => existing.word.toLowerCase() === w.word.toLowerCase())) {
        updatedVocab.push({
          id: "vocab-" + Math.random().toString(36).substring(7),
          word: w.word,
          translation: w.translation,
          example: w.example,
          exampleTranslation: w.exampleTranslation,
          category: w.category,
          mastery: 5,
          learnedAt: new Date().toISOString()
        });
      }
    });

    // Update streak continuously (RN-005)
    let newStreak = profile.streak;
    const today = new Date().toLocaleDateString();
    if (profile.lastActiveDate !== today) {
      newStreak += 1;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      completedLessons: updatedCompleted,
      streak: newStreak,
      lastActiveDate: today,
      vocabularyCount: updatedVocab.length
    };

    setVocabulary(updatedVocab);
    localStorage.setItem(`playenglish_vocabulary_${profile.id}`, JSON.stringify(updatedVocab));
    saveProfile(updatedProfile);
  };

  const handleCompleteActiveLesson = (wordsLearned: any[]) => {
    recordLessonCompletion(wordsLearned);
    setActiveLessonId(null);
    setActiveTab("trilha");
  };

  // Award XP for standalone features (like writing challenges)
  const handleAwardXp = (xpReward: number) => {
    if (!profile) return;
    saveProfile({
      ...profile,
      xp: profile.xp + xpReward
    });
  };

  const createNextMission = async (completedLesson: Lesson): Promise<Lesson> => {
    if (!profile) throw new Error("Perfil não disponível.");
    try {
      const response = await fetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        age: profile.age ?? (profile.ageGroup === "kids" ? 8 : 13), ageGroup: profile.ageGroup,
        userLevel: getLevelAndProgress(profile.xp).level, goal: profile.goal, previousLessonTitle: completedLesson.title,
        completedLessonTitles: lessons.slice(-8).map((item) => item.title),
      }) });
      const data = await response.json();
      if (!response.ok || !data.lesson || !Array.isArray(data.lesson.exercises)) throw new Error(data.error || "Não foi possível criar a próxima missão.");
      return data.lesson as Lesson;
    } catch (error) {
      console.error("Missão por IA indisponível.", error);
      throw error instanceof Error ? error : new Error("Não foi possível criar sua nova missão com a IA.");
    }
  };

  const handleContinueJourney = async (wordsLearned: any[], currentLesson: Lesson) => {
    // Every new step in the journey is created for the student's current
    // profile. The starter lessons remain visible on the map, but must not
    // force the student into a fixed sequence after finishing a mission.
    const generatedLesson = await createNextMission(currentLesson);
    // A missão só é registrada e aberta quando a IA devolve uma estrutura válida.
    // Assim, não existe avanço automático nem uma missão local apresentada como IA.
    recordLessonCompletion(wordsLearned);
    handleUpdateLessons([...lessons, generatedLesson]);
    setActiveLessonId(generatedLesson.id);
  };

  // LogOut helper to allow changing profile / avatar
  const handleLogOut = () => {
    if (confirm("Quer mesmo trocar de perfil? Seu progresso continuará salvo no seu navegador!")) {
      setProfile(null);
      localStorage.removeItem("playenglish_profile");
    }
  };

  // If no profile, show onboarding wizard
  if (!profile) {
    return <Onboarding onComplete={saveProfile} />;
  }

  // If inside active learning lesson, show lesson viewport
  if (activeLessonId) {
    const activeLessonObj = lessons.find((l) => l.id === activeLessonId);
    if (activeLessonObj) {
      return (
        <React.Fragment key={activeLessonObj.id}>
          <LessonScreen
            lesson={activeLessonObj}
            profile={profile}
            onClose={() => setActiveLessonId(null)}
            onComplete={handleCompleteActiveLesson}
            onAwardXp={handleAwardXp}
            nextLesson={null}
            onContinueToNextLesson={(wordsLearned) => handleContinueJourney(wordsLearned, activeLessonObj)}
          />
        </React.Fragment>
      );
    }
  }

  // Buddy specifications
  const buddySpec = {
    bunny: { name: "Pip", icon: "🐰", greeting: `Olá ${profile.displayName}! Pronto para dar alguns pulos no seu inglês hoje? 🐰` },
    bear: { name: "Barnaby", icon: "🐻", greeting: `Olá ${profile.displayName}! Vamos comer um melzinho e estudar bastante inglês juntos? 🐻` },
    fox: { name: "Fiona", icon: "🦊", greeting: `Ei ${profile.displayName}! Fiona aqui. Vamos descobrir novas palavras hoje na floresta? 🦊` },
    lion: { name: "Leo", icon: "🦁", greeting: `Fala ${profile.displayName}! Força total no inglês hoje para sermos campeões! 🦁` }
  }[profile.avatar];

  // Leveling Calculations
  const levelData = getLevelAndProgress(profile.xp);
  const currentLevel = levelData.level;
  const xpInCurrentLevel = levelData.xpInCurrentLevel;
  const xpPercentage = levelData.xpPercentage;
  const nextLevelXpNeeded = levelData.xpRemaining;
  const xpNeededForNextLevel = levelData.xpNeededForNextLevel;

  // Recommended Lesson logic
  const recommendedLesson = lessons.find(l => !profile.completedLessons.includes(l.id)) || lessons[0];

  return (
    <div className="min-h-screen bg-[#F0F2FF] text-[#1A1C3D] flex flex-col justify-between">
      
      {/* Visual background dots decor */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-35 pointer-events-none z-0" />

      {/* Primary Desktop Sidebar + Top Header shell */}
      <div className="relative z-10 flex-grow flex flex-col w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg">
              🚀
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1A1C3D] tracking-tight">SpaceAcademy</h1>
              <p className="text-sm font-bold text-blue-600 bg-blue-100 px-3 py-0.5 rounded-full inline-block mt-1">
                AMBIENTE SEGURO • {profile.ageGroup === "kids" ? "MODO ALUNO (KIDS)" : "MODO JOVEM"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <SupporterBadge showTooltip={true} size="md" />
            <div 
              onClick={() => setShowEditProfile(true)}
              className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
              title="Clique para editar seu perfil"
            >
              <p className="text-sm font-bold text-gray-500">Olá, Explorador!</p>
              <p className="text-xl font-black text-[#1A1C3D] flex items-center gap-1.5 justify-end">
                {profile.displayName} {profile.profileEmoji || "🚀"}
                <Edit3 className="w-4 h-4 text-slate-400" />
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden relative group bg-gradient-to-tr from-purple-500 via-indigo-500 to-sky-400 cursor-pointer hover:scale-105 transition-transform"
              title="Clique para editar seu perfil"
            >
              <div className="w-full h-full flex items-center justify-center text-3xl select-none animate-pulse">
                {profile.profileEmoji || "🚀"}
              </div>
            </button>
            
            {/* Edit Profile button */}
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="p-3 bg-white hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-2xl transition-all cursor-pointer shadow-sm border border-slate-100"
              title="Editar Perfil"
            >
              <Edit3 className="w-5 h-5" />
            </button>

            {/* Quick LogOut / Change Profile action */}
            <button
              type="button"
              onClick={handleLogOut}
              className="p-3 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all cursor-pointer shadow-sm border border-slate-100"
              title="Trocar Perfil / Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Companion Greetings speech bubble */}
        {buddySpec && (
          <section className="mb-8 max-w-3xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm shrink-0 select-none border border-slate-100">
                {buddySpec.icon}
              </div>
              <div className="bg-white border-b-4 border-blue-500 rounded-2xl py-3 px-5 shadow-sm relative text-xs md:text-sm font-bold text-[#1A1C3D] leading-relaxed flex-1">
                {/* Speech bubble pointer */}
                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-l border-b border-slate-100 rotate-45" />
                {buddySpec.greeting}
              </div>
            </div>
          </section>
        )}

        {/* Interactive content viewport */}
        <main className="flex-grow flex flex-col">
          
          {/* TAB 1: Trail map (Trilha de lições) - Bento Grid Style */}
          {activeTab === "trilha" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Block 1: Recommended Lesson (Hero) - span-8 */}
              {recommendedLesson && (
                <div className="md:col-span-8 bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 flex flex-col relative overflow-hidden justify-between border-b-8 border-sky-400 min-h-[340px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
                  <div className="relative z-10">
                    <span className="px-4 py-2 bg-yellow-400 text-[#1A1C3D] text-xs font-black rounded-full uppercase tracking-widest">
                      Destaque do Aprendizado
                    </span>
                    <div className="flex items-start gap-4 mt-6">
                      <span className="text-5xl bg-slate-50 p-3 rounded-3xl border border-slate-100 shrink-0 select-none">
                        {recommendedLesson.icon}
                      </span>
                      <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#1A1C3D] leading-tight">
                          {recommendedLesson.title}
                        </h2>
                        <p className="text-gray-500 text-sm md:text-base mt-2 max-w-md font-medium leading-relaxed">
                          {recommendedLesson.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 relative z-10">
                    <button
                      type="button"
                      onClick={() => setActiveLessonId(recommendedLesson.id)}
                      className="px-8 py-4 bg-[#1A1C3D] text-white rounded-3xl font-black text-lg hover:scale-105 transition-transform shadow-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" /> COMEÇAR AGORA
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-500">⭐ +{recommendedLesson.xpReward} XP</span>
                      <div className="flex -space-x-3 ml-2 select-none">
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-green-200 flex items-center justify-center text-lg shadow-sm">🦖</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-purple-200 flex items-center justify-center text-lg shadow-sm">🐼</div>
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-pink-200 flex items-center justify-center text-lg shadow-sm">🦁</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Block 2: Sua Jornada (Level Progress / Stats) - span-4 */}
              <div className="md:col-span-4 bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 flex flex-col justify-between border-b-8 border-purple-500 min-h-[340px]">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-black text-[#1A1C3D] text-xl leading-tight">Sua Jornada</h3>
                      <p className="text-xs font-bold text-purple-500 mt-1">{getLevelTitle(currentLevel)}</p>
                    </div>
                    <span className="text-purple-600 font-black text-xs bg-purple-50 px-3 py-1.5 rounded-full shrink-0">
                      Nível {currentLevel}
                    </span>
                  </div>
                  <div className="space-y-4 mt-6">
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${xpPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                      <span>{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
                      <span>Faltam {nextLevelXpNeeded} XP para o Nível {currentLevel + 1}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-purple-50 p-4 rounded-3xl text-center border border-purple-100/50">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="text-lg font-black text-purple-700">{profile.xp}</div>
                    <div className="text-[9px] uppercase font-black text-purple-400">Estrelas</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-3xl text-center border border-blue-100/50">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-lg font-black text-blue-700">{profile.completedLessons.length}</div>
                    <div className="text-[9px] uppercase font-black text-blue-400">Troféus</div>
                  </div>
                </div>
              </div>

              {/* Block 3: Central dos Pais - span-4 */}
              <div className="md:col-span-4 bg-[#1A1C3D] rounded-[40px] shadow-xl p-8 flex flex-col justify-between text-white min-h-[320px]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-white text-xl">Central dos Pais</h3>
                    <p className="text-slate-400 text-xs font-semibold mt-1">Supervisão Acadêmica Segura</p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">⚙️</div>
                </div>
                
                <div className="space-y-3 my-4">
                  <div className="bg-white/10 p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                    <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-sm">🛡️</div>
                    <div className="text-xs text-white font-bold">Modo 100% Kid-Safe</div>
                  </div>
                  <div className="bg-white/10 p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                    <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-sm">✅</div>
                    <div className="text-xs text-white font-bold">Relatório Salvo no Navegador</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("admin")}
                  className="w-full py-4 bg-white text-[#1A1C3D] hover:bg-sky-50 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center block"
                >
                  Acessar Painel Supervisor
                </button>
              </div>

              {/* Block 4: Baú de Palavras (Bento Link) - span-4 */}
              <div 
                onClick={() => setActiveTab("vocabulario")}
                className="md:col-span-4 bg-orange-400 rounded-[40px] shadow-sm p-8 flex flex-col justify-center items-center text-white border-b-8 border-orange-600 cursor-pointer hover:scale-[1.02] transition-transform min-h-[200px]"
              >
                <div className="text-5xl mb-3">🃏</div>
                <h4 className="text-xl font-black">Baú de Palavras</h4>
                <p className="text-orange-100 text-xs font-bold mt-1 uppercase tracking-wider">
                  {profile.vocabularyCount} Palavras Guardadas
                </p>
              </div>

              {/* Block 5: Escrita Mágica (Bento Link) - span-4 */}
              <div 
                onClick={() => setActiveTab("escrita")}
                className="md:col-span-4 bg-green-400 rounded-[40px] shadow-sm p-8 flex flex-col justify-center items-center text-white border-b-8 border-green-600 cursor-pointer hover:scale-[1.02] transition-transform min-h-[200px]"
              >
                <div className="text-5xl mb-3">✍️</div>
                <h4 className="text-xl font-black">Escrita Mágica IA</h4>
                <p className="text-green-100 text-xs font-bold mt-1 uppercase tracking-wider">
                  Desafios Gramaticais
                </p>
              </div>

              {/* Block 6: Guia de Sobrevivência Espacial & Gamificação (Bento Banner) - span-12 */}
              <div 
                onClick={() => setShowGuide(true)}
                className="md:col-span-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[40px] shadow-xl p-8 flex flex-col md:flex-row justify-between items-center text-white border-b-8 border-indigo-800 cursor-pointer hover:scale-[1.01] transition-transform gap-6"
                id="journey-guide-bento-card"
              >
                <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                  <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-4xl shrink-0 select-none animate-bounce">
                    🚀
                  </div>
                  <div>
                    <h4 className="text-2xl font-black">Como funciona a SpaceAcademy?</h4>
                    <p className="text-purple-100 text-xs md:text-sm font-semibold mt-1 max-w-xl">
                      Entenda as regras da gamificação, ofensivas diárias (streaks), bônus de XP, todos os níveis de inglês disponíveis e as ferramentas inteligentes de IA!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGuide(true);
                  }}
                  className="px-6 py-4 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-purple-50 transition-colors shrink-0 shadow-md"
                >
                  Abrir Guia do Aluno 📖
                </button>
              </div>

              {/* Trail map expansion row - span-12 */}
              <div className="md:col-span-12 mt-6">
                <h3 className="text-2xl font-black text-[#1A1C3D] mb-6 flex items-center gap-2">
                  🗺️ Mapa das Ilhas de Estudo ({lessons.length} lições)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="learning-trail-map">
                  {lessons.map((lesson, idx) => {
                    const isDone = profile.completedLessons.includes(lesson.id);
                    const isUnlocked = idx === 0 || profile.completedLessons.includes(lessons[idx - 1].id);

                    return (
                      <div
                        key={lesson.id}
                        className={`relative bg-white rounded-[32px] border-3 p-6 flex flex-col justify-between transition-all ${
                          isUnlocked 
                            ? "border-slate-100 hover:border-sky-300 shadow-sm hover:scale-[1.01]" 
                            : "border-slate-200/50 opacity-60 bg-slate-50/50 pointer-events-none"
                        }`}
                        id={`lesson-card-${lesson.id}`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-4xl bg-[#F0F2FF] p-3 rounded-2xl border border-slate-100 select-none">{lesson.icon}</span>
                            {isDone ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> CONCLUÍDA
                              </span>
                            ) : isUnlocked ? (
                              <span className="text-[10px] bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-black">
                                DISPONÍVEL
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-200 text-slate-500 px-3 py-1 rounded-full font-black flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-400 shrink-0" /> BLOQUEADA
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-lg text-[#1A1C3D] leading-tight">
                            {lesson.title}
                          </h3>
                          <p className="text-gray-500 text-xs font-semibold mt-2 leading-relaxed">
                            {lesson.description}
                          </p>
                        </div>

                        <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                            ⭐ {lesson.xpReward} XP
                          </span>

                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => setActiveLessonId(lesson.id)}
                              className="py-2.5 px-4 bg-sky-400 hover:bg-sky-500 text-white font-black text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" /> {isDone ? "Praticar" : "Começar"}
                            </button>
                          ) : (
                            <span className="text-xs font-extrabold text-slate-400">Bloqueado</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Vocabulary training flashcards */}
          {activeTab === "vocabulario" && (
            <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-orange-500 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-black text-[#1A1C3D]">Seu Baú de Vocabulário 🃏</h2>
                <p className="text-gray-500 text-sm font-semibold mt-1">
                  Revise as palavras que você aprendeu nas lições para nunca mais esquecê-las!
                </p>
              </div>

              <VocabularyTrainer
                vocabulary={vocabulary}
                onUpdateVocabulary={handleUpdateVocabulary}
                onAddWord={handleAddVocabularyWord}
              />
            </div>
          )}

          {/* TAB 3: Tutor IA text chat */}
          {activeTab === "tutor" && (
            <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-blue-500 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-black text-[#1A1C3D]">Conversa com Tutor de IA 💬</h2>
                <p className="text-gray-500 text-sm font-semibold mt-1">
                  Converse em inglês sobre qualquer assunto de forma segura! Clique nos botões de sugestões se precisar de ajuda.
                </p>
              </div>

              <TutorChat profile={profile} />
            </div>
          )}

          {/* TAB 4: Writing challenge panels */}
          {activeTab === "escrita" && (
            <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-green-500 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-black text-[#1A1C3D]">Aventura da Escrita Mágica ✍️</h2>
                <p className="text-gray-500 text-sm font-semibold mt-1">
                  Pratique escrever frases completas em inglês e receba dicas brilhantes do nosso corretor de IA!
                </p>
              </div>

              <WritingChallenge profile={profile} onXpEarned={handleAwardXp} />
            </div>
          )}

          {/* TAB 5: Admin Panel */}
          {activeTab === "admin" && (
            <div className="space-y-6 flex flex-col w-full" id="parent-supervisor-control-center">
              
              {/* Parent Quick Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* 1. Support Entry Card */}
                <SupportEntryCard 
                  onOpenSupport={() => setShowSupportModal(true)} 
                  className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border-b-8 border-sky-400 min-h-[250px]"
                />

                {/* 2. Backup, Restore & Data Help Center */}
                <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border-b-8 border-purple-500 flex flex-col justify-between min-h-[250px]" id="parent-backup-help-container">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-[#1A1C3D] text-lg">Backup e Ajuda do Progresso 💾</h3>
                        <p className="text-purple-600 text-[11px] font-bold mt-0.5 uppercase tracking-wider">Gestão Local-First do Aluno</p>
                      </div>
                      <span className="text-2xl select-none">🛡️</span>
                    </div>

                    {/* US-08 Help Notice */}
                    <div className="space-y-1.5 text-slate-500 text-[11px] font-semibold leading-relaxed">
                      <p className="font-extrabold text-[#1A1C3D] text-xs flex items-center gap-1">
                        <Info size={12} className="text-purple-500" /> Onde meus dados ficam salvos?
                      </p>
                      <p>
                        Seu progresso, estrelas (XP), vocabulário e selos ficam salvos <strong>somente neste navegador</strong> e aparelho.
                      </p>
                      <p>
                        Se você limpar o cache, usar guia anônima ou trocar de aparelho, os dados não serão sincronizados automaticamente. <strong>Sempre recomendamos exportar o progresso regularmente!</strong>
                      </p>
                    </div>
                  </div>

                  {/* US-09 Export/Import Buttons */}
                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        exportAllData();
                        logTelemetryEvent("progress_exported");
                      }}
                      className="py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                      id="parent-export-btn"
                    >
                      <Clipboard size={14} />
                      Exportar Progresso
                    </button>
                    
                    <label className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer text-center relative">
                      <Upload size={14} />
                      <span>Importar Progresso</span>
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result;
                            if (typeof result === "string") {
                              const res = importAllData(result);
                              if (res.success) {
                                logTelemetryEvent("progress_imported");
                                alert("✓ Progresso e selo restaurados com sucesso! A página será atualizada.");
                                window.location.reload();
                              } else {
                                alert(`❌ Erro ao importar: ${res.error}`);
                              }
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* Space Shop Card for Gamified Purchases (Emojis & Levels) */}
              <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-indigo-500 w-full">
                <SpaceShopCard
                  onSelectItem={(shopItem) => {
                    setSelectedShopItem(shopItem);
                    setShowShopModal(true);
                  }}
                />
              </div>

              {/* Original Academic Supervisor AdminPanel */}
              <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-rose-500 flex flex-col gap-6 w-full">
                <div>
                  <h2 className="text-3xl font-black text-[#1A1C3D]">Supervisor Acadêmico 🛠️</h2>
                  <p className="text-gray-500 text-sm font-semibold mt-1">
                    Gerencie o conteúdo didático e as lições disponíveis para os alunos em tempo real sem fazer deploys.
                  </p>
                </div>

                <AdminPanel
                  lessons={lessons}
                  onUpdateLessons={handleUpdateLessons}
                  onResetLessons={handleResetLessons}
                />
              </div>

            </div>
          )}

          {/* TAB 6: Space Shop */}
          {activeTab === "loja" && (
            <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-indigo-500 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                <div>
                  <h2 className="text-3xl font-black text-indigo-950 flex items-center gap-2">Loja Cósmica 🪐</h2>
                  <p className="text-gray-500 text-sm font-semibold mt-1">
                    Turbine seu aprendizado com itens exclusivos de customização e boosts de nível!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(true)}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer self-start md:self-auto"
                >
                  ⚙️ Usar Meus Emojis
                </button>
              </div>

              <SpaceShopCard
                onSelectItem={(shopItem) => {
                  setSelectedShopItem(shopItem);
                  setShowShopModal(true);
                }}
              />
            </div>
          )}

        </main>
      </div>

      {/* Footer from design */}
      <footer className="mt-8 mb-4 flex flex-col sm:flex-row justify-between items-center text-[#1A1C3D] font-bold opacity-60 text-xs w-full max-w-6xl mx-auto px-4 gap-2 text-center">
        <div className="flex gap-6 flex-wrap justify-center">
          <span>SPACEACADEMY • PLAYENGLISH</span>
          <span>AMBIENTE SEGURO E MONITORADO</span>
          <span>SUPORTE DOS PAIS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          SISTEMA SEGURO • PRIVACIDADE COMPLETA
        </div>
      </footer>

      {/* Navigation Tab Bar / Responsive Header bottom menu */}
      <nav className="relative z-20 bg-white/95 backdrop-blur-md border-t-2 border-slate-100 py-4 px-6 shadow-xl sticky bottom-0">
        <div className="w-full max-w-xl mx-auto flex items-center justify-between text-slate-400">
          
          {/* Trilha 🗺️ */}
          <button
            type="button"
            id="tab-trilha"
            onClick={() => setActiveTab("trilha")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "trilha" ? "text-sky-500 scale-105" : "hover:text-slate-600"
            }`}
          >
            <Home className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Trilha 🗺️</span>
          </button>

          {/* Vocabulário 🃏 */}
          <button
            type="button"
            id="tab-vocabulario"
            onClick={() => setActiveTab("vocabulario")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "vocabulario" ? "text-orange-500 scale-105" : "hover:text-slate-600"
            }`}
          >
            <BookOpen className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Baú 🃏</span>
          </button>

          {/* Tutor IA 💬 */}
          <button
            type="button"
            id="tab-tutor"
            onClick={() => setActiveTab("tutor")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "tutor" ? "text-blue-500 scale-105" : "hover:text-slate-600"
            }`}
          >
            <MessageSquare className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Tutor IA 💬</span>
          </button>

          {/* Escrita Mágica ✍️ */}
          <button
            type="button"
            id="tab-escrita"
            onClick={() => setActiveTab("escrita")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "escrita" ? "text-green-500 scale-105" : "hover:text-slate-600"
            }`}
          >
            <PenTool className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Escrita ✍️</span>
          </button>

          {/* Loja Cósmica 🪐 */}
          <button
            type="button"
            id="tab-loja"
            onClick={() => {
              setActiveTab("loja");
              logTelemetryEvent("shop_tab_clicked");
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
              activeTab === "loja" 
                ? "text-indigo-600 scale-105" 
                : "text-indigo-400 hover:text-indigo-600 animate-pulse"
            }`}
          >
            <ShoppingBag className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Loja 🪐</span>
            {activeTab !== "loja" && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          {/* Supervisor Admin 🛠️ */}
          <button
            type="button"
            id="tab-admin"
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "admin" ? "text-rose-500 scale-105" : "hover:text-slate-600"
            }`}
          >
            <Settings className="w-6 h-6 stroke-[2.5px]" />
            <span className="text-[10px] font-black">Admin 🛠️</span>
          </button>

        </div>
      </nav>

      {/* Interactive Journey Guide Modal */}
      <JourneyGuide 
        isOpen={showGuide} 
        onClose={() => setShowGuide(false)} 
        currentXp={profile.xp} 
      />

      {/* Support / Pix Donation Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => {
          setShowSupportModal(false);
          syncSupportStatus();
        }}
        profile={profile}
        onBadgeActivated={syncSupportStatus}
      />

      {/* Space Shop Gamification Modal */}
      <SpaceShopModal
        isOpen={showShopModal}
        onClose={() => {
          setShowShopModal(false);
          setSelectedShopItem(null);
        }}
        item={selectedShopItem}
        profile={profile}
        onProfileUpdate={(updatedProfile) => {
          saveProfile(updatedProfile);
        }}
      />

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border-4 border-sky-100 flex flex-col relative animate-scale-up">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-5 text-white flex justify-between items-center relative shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-white" />
                <h3 className="font-black text-lg tracking-tight">Editar Seu Perfil Espacial</h3>
              </div>
              <button
                onClick={() => setShowEditProfile(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome ou Apelido 🧑‍🚀
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value.slice(0, 20))}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors text-sm"
                />
              </div>

              {/* Age Group / Modo */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Faixa Etária / Modo de Aprendizado 🎒
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditedAgeGroup("kids")}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editedAgeGroup === "kids"
                        ? "border-sky-400 bg-sky-50 text-sky-700 font-black shadow-sm"
                        : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    🧸 Modo Aluno (Kids)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditedAgeGroup("teens")}
                    className={`py-2 px-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editedAgeGroup === "teens"
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-black shadow-sm"
                        : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    ⚡ Modo Jovem (Teen)
                  </button>
                </div>
              </div>

              {/* Emoji selector */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Escolha seu Emoji de Jogador 🌟
                </label>
                <div className="grid grid-cols-8 gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-100 max-h-[110px] overflow-y-auto">
                  {(() => {
                    const defaultEmojis = [
                      "🧸", "🦄", "🦖", "🚀", "🦁", "🐼", "🍦", "🌈",
                      "🎮", "😎", "🎧", "🛹", "⚡", "👾", "💻", "🤘"
                    ];
                    const unlocked = getUnlockedEmojis();
                    const combined = Array.from(new Set([...defaultEmojis, ...unlocked]));
                    return combined.map((emoji) => {
                      const isSelected = editedEmoji === emoji;
                      const isPremium = unlocked.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditedEmoji(emoji)}
                          className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-sky-400 text-white scale-110 shadow-sm"
                              : "bg-white hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {emoji}
                          {isPremium && (
                            <span className="absolute -top-1 -right-1 text-[8px] bg-amber-400 text-amber-950 font-black rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs select-none">
                              ⭐
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Secret Password */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Sua Senha Secreta 🔒
                </label>
                <div className="relative">
                  <input
                    type={showEditedPassword ? "text" : "password"}
                    value={editedPassword}
                    onChange={(e) => setEditedPassword(e.target.value.slice(0, 15))}
                    placeholder="Sua senha secreta"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-sky-400 outline-none rounded-xl font-bold text-slate-800 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditedPassword(!showEditedPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showEditedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Guarde esta senha! Ela protege o acesso ao seu perfil no aparelho.
                </p>
              </div>

              {editError && (
                <div className="text-xs text-red-500 font-extrabold flex items-center gap-1.5 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
                </div>
              )}

              {editSuccess && (
                <div className="text-xs text-emerald-600 font-extrabold flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Perfil atualizado com sucesso! 🚀
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editedName.trim()) {
                    setEditError("O nome não pode ficar vazio!");
                    return;
                  }
                  if (!editedPassword.trim()) {
                    setEditError("Você precisa definir uma senha secreta!");
                    return;
                  }
                  
                  // Save updated profile
                  saveProfile({
                    ...profile,
                    displayName: editedName.trim(),
                    profileEmoji: editedEmoji,
                    ageGroup: editedAgeGroup,
                    password: editedPassword.trim()
                  });

                  setEditError("");
                  setEditSuccess(true);
                  setTimeout(() => {
                    setShowEditProfile(false);
                    setEditSuccess(false);
                  }, 800);
                }}
                className="flex-1 py-2.5 bg-sky-400 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sky-100 cursor-pointer"
              >
                Salvar Alterações <Save className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
