/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, Lesson, VocabularyItem } from "./types";
import { INITIAL_LESSONS, INITIAL_VOCABULARY } from "./data";
import Onboarding from "./components/Onboarding";
import LessonScreen from "./components/LessonScreen";
import TutorChat from "./components/TutorChat";
import AdminPanel from "./components/AdminPanel";
import VocabularyTrainer from "./components/VocabularyTrainer";
import WritingChallenge from "./components/WritingChallenge";
import JourneyGuide from "./components/JourneyGuide";
import { 
  Sparkles, BookOpen, MessageSquare, Flame, LogOut, 
  Settings, PenTool, Home, Star, Play, Lock, CheckCircle2, Award 
} from "lucide-react";

export default function App() {
  // Core Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Custom lessons from localStorage or default static
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Vocabulary state
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  
  // App visual states
  const [activeTab, setActiveTab] = useState<"trilha" | "vocabulario" | "tutor" | "escrita" | "admin">("trilha");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Initialize data on load
  useEffect(() => {
    // 1. Get profile
    const storedProfile = localStorage.getItem("playenglish_profile");
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch (err) {
        console.error("Erro ao ler perfil:", err);
      }
    }

    // 2. Get custom lessons
    const storedLessons = localStorage.getItem("playenglish_lessons");
    if (storedLessons) {
      try {
        setLessons(JSON.parse(storedLessons));
      } catch (err) {
        setLessons(INITIAL_LESSONS);
      }
    } else {
      setLessons(INITIAL_LESSONS);
      localStorage.setItem("playenglish_lessons", JSON.stringify(INITIAL_LESSONS));
    }

    // 3. Get custom vocabulary
    const storedVocab = localStorage.getItem("playenglish_vocabulary");
    if (storedVocab) {
      try {
        setVocabulary(JSON.parse(storedVocab));
      } catch (err) {
        setVocabulary(INITIAL_VOCABULARY);
      }
    } else {
      setVocabulary(INITIAL_VOCABULARY);
      localStorage.setItem("playenglish_vocabulary", JSON.stringify(INITIAL_VOCABULARY));
    }
  }, []);

  // Save profile helper
  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem("playenglish_profile", JSON.stringify(newProfile));
  };

  // Save lessons helper
  const handleUpdateLessons = (updated: Lesson[]) => {
    setLessons(updated);
    localStorage.setItem("playenglish_lessons", JSON.stringify(updated));
  };

  // Reset lessons helper
  const handleResetLessons = () => {
    if (confirm("Quer mesmo restaurar todas as lições para o modelo original? Isso apagará seus exercícios customizados.")) {
      setLessons(INITIAL_LESSONS);
      localStorage.setItem("playenglish_lessons", JSON.stringify(INITIAL_LESSONS));
    }
  };

  // Update vocabulary list helper
  const handleUpdateVocabulary = (updated: VocabularyItem[]) => {
    setVocabulary(updated);
    localStorage.setItem("playenglish_vocabulary", JSON.stringify(updated));
    if (profile) {
      saveProfile({ ...profile, vocabularyCount: updated.length });
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
  const handleCompleteActiveLesson = (xpReward: number, wordsLearned: any[]) => {
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
      xp: profile.xp + xpReward,
      completedLessons: updatedCompleted,
      streak: newStreak,
      lastActiveDate: today,
      vocabularyCount: updatedVocab.length
    };

    setVocabulary(updatedVocab);
    localStorage.setItem("playenglish_vocabulary", JSON.stringify(updatedVocab));
    saveProfile(updatedProfile);
    setActiveLessonId(null); // exit lesson screen
    setActiveTab("trilha"); // return to trail
  };

  // Award XP for standalone features (like writing challenges)
  const handleAwardXp = (xpReward: number) => {
    if (!profile) return;
    saveProfile({
      ...profile,
      xp: profile.xp + xpReward
    });
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
        <LessonScreen
          lesson={activeLessonObj}
          profile={profile}
          onClose={() => setActiveLessonId(null)}
          onComplete={handleCompleteActiveLesson}
        />
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
  const currentLevel = Math.floor(profile.xp / 450) + 1;
  const xpInCurrentLevel = profile.xp % 450;
  const xpPercentage = Math.min(100, Math.floor((xpInCurrentLevel / 450) * 100));
  const nextLevelXpNeeded = 450 - xpInCurrentLevel;

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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-500">Olá, Explorador!</p>
              <p className="text-xl font-black text-[#1A1C3D]">{profile.displayName} {profile.profileEmoji || "🚀"}</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden relative group bg-gradient-to-tr from-purple-500 via-indigo-500 to-sky-400">
              <div className="w-full h-full flex items-center justify-center text-3xl select-none">
                {profile.profileEmoji || "🚀"}
              </div>
            </div>
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
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-[#1A1C3D] text-xl">Sua Jornada</h3>
                    <span className="text-purple-600 font-black text-xs bg-purple-50 px-3 py-1 rounded-full">
                      Nível {currentLevel}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${xpPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                      <span>{xpInCurrentLevel} / 450 XP</span>
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
            <div className="bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-10 border-b-8 border-rose-500 flex flex-col gap-6">
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
        <div className="w-full max-w-lg mx-auto flex items-center justify-between text-slate-400">
          
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

    </div>
  );
}

