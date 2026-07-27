import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Lesson, Exercise, UserProfile, AvatarType } from "../types";
import { ArrowLeft, Volume2, Check, X, Sparkles, AlertCircle, HelpCircle, Star, Send, Play } from "lucide-react";
import { getLevelAndProgress, getLevelTitle } from "../utils/levels";

interface LessonScreenProps {
  lesson: Lesson;
  profile: UserProfile;
  onClose: () => void;
  onComplete: (wordsLearned: { word: string; translation: string; category: string; example: string; exampleTranslation: string }[]) => void;
  onAwardXp: (xp: number) => void;
  nextLesson?: Lesson | null;
  onContinueToNextLesson?: (wordsLearned: { word: string; translation: string; category: string; example: string; exampleTranslation: string }[]) => Promise<void> | void;
}

const AVATARS: Record<AvatarType, { name: string; icon: string }> = {
  bunny: { name: "Pip", icon: "🐰" },
  bear: { name: "Barnaby", icon: "🐻" },
  fox: { name: "Fiona", icon: "🦊" },
  lion: { name: "Leo", icon: "🦁" }
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

export default function LessonScreen({ lesson, profile, onClose, onComplete, onAwardXp, nextLesson, onContinueToNextLesson }: LessonScreenProps) {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [scrambledSelected, setScrambledSelected] = useState<string[]>([]);
  const [blankInput, setBlankInput] = useState<string>("");
  
  // Match Pairs states
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({}); // leftWord -> rightWord
  
  // AI Writing state
  const [writingInput, setWritingInput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);

  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  
  // Track words learned in this lesson to add to vocabulary
  const [newWords, setNewWords] = useState<any[]>([]);
  const [earnedXp, setEarnedXp] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [continuingJourney, setContinuingJourney] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const previousLevel = useRef(getLevelAndProgress(profile.xp).level);

  const exercise: Exercise = lesson.exercises[currentIdx];
  const xpPerExercise = Math.max(10, Math.floor(lesson.xpReward / lesson.exercises.length));

  useEffect(() => {
    const level = getLevelAndProgress(profile.xp).level;
    if (level > previousLevel.current) setLevelUp(level);
    previousLevel.current = level;
  }, [profile.xp]);

  useEffect(() => {
    // Speak prompt audio if available automatically
    if (exercise && exercise.audioText && !hasChecked) {
      const timer = setTimeout(() => {
        speakEnglish(exercise.audioText!);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, hasChecked]);

  if (!exercise) return null;

  // Handle word selection in scrambled sentences
  const toggleScrambleWord = (word: string) => {
    if (hasChecked) return;
    if (scrambledSelected.includes(word)) {
      setScrambledSelected(scrambledSelected.filter((w) => w !== word));
    } else {
      setScrambledSelected([...scrambledSelected, word]);
    }
  };

  // Match Pairs Selection
  const handleLeftClick = (word: string) => {
    if (hasChecked) return;
    setSelectedLeft(word);
    if (selectedRight) {
      verifyPair(word, selectedRight);
    }
  };

  const handleRightClick = (word: string) => {
    if (hasChecked) return;
    setSelectedRight(word);
    if (selectedLeft) {
      verifyPair(selectedLeft, word);
    }
  };

  const verifyPair = (left: string, right: string) => {
    // Find matching index in leftPairs / rightPairs
    const leftIdx = exercise.leftPairs?.indexOf(left);
    const rightIdx = exercise.rightPairs?.indexOf(right);
    
    if (leftIdx !== undefined && rightIdx !== undefined && leftIdx === rightIdx) {
      // It is a match!
      setMatchedPairs((prev) => ({ ...prev, [left]: right }));
      speakEnglish(left);
    }
    
    // Reset selections
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  // Writing Challenge Assistant API
  const checkWritingWithAI = async () => {
    if (!writingInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await fetch("/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: writingInput,
          prompt: exercise.writingPrompt,
          targetLevel: "A1",
          userLevel: getLevelAndProgress(profile.xp).level,
          ageGroup: profile.ageGroup
        })
      });
      const data = await res.json();
      if (!res.ok || typeof data.isCorrect !== "boolean") {
        throw new Error(data.error || "Não foi possível avaliar a resposta.");
      }
      setAiFeedback(data);
      setIsAnswerCorrect(data.isCorrect);
      setHasChecked(true);
      if (data.isCorrect) {
        onAwardXp(xpPerExercise);
        setEarnedXp((value) => value + xpPerExercise);
      }
    } catch (err) {
      console.error(err);
      const diagnosticMessage = err instanceof Error ? err.message : "Não foi possível avaliar a resposta.";
      // A failed correction must never be presented as a correct answer.
      setAiFeedback({
        isCorrect: false,
        celebration: "Ainda não consegui corrigir sua frase agora.",
        corrections: [diagnosticMessage],
        improvedVersion: writingInput,
        explanation: "Nenhum XP foi concedido sem uma avaliação válida."
      });
      setIsAnswerCorrect(false);
      setHasChecked(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    if (hasChecked) return;

    let correct = false;

    if (exercise.type === "multiple-choice") {
      correct = selectedOption === exercise.correctAnswer;
    } else if (exercise.type === "arrange-words") {
      const compiled = scrambledSelected.join(" ");
      correct = compiled.trim().toLowerCase() === (exercise.correctAnswer as string).trim().toLowerCase();
    } else if (exercise.type === "fill-blank") {
      correct = blankInput.trim().toLowerCase() === (exercise.correctAnswer as string).trim().toLowerCase();
    } else if (exercise.type === "match-pairs") {
      // Correct if all pairs are matched
      const totalPairs = exercise.leftPairs?.length || 0;
      correct = Object.keys(matchedPairs).length === totalPairs;
    }

    setIsAnswerCorrect(correct);
    setHasChecked(true);

    if (correct) {
      onAwardXp(xpPerExercise);
      setEarnedXp((value) => value + xpPerExercise);
    }

    if (exercise.audioText && correct) {
      speakEnglish(exercise.audioText);
    }

    // Add to words learned if it is a correct vocabulary piece
    if (correct && exercise.audioText) {
      const newWord = {
        word: exercise.audioText,
        translation: typeof exercise.correctAnswer === "string" ? exercise.correctAnswer : exercise.correctAnswer[0] || "",
        category: lesson.title,
        example: exercise.prompt,
        exampleTranslation: exercise.translationContext || ""
      };
      if (!newWords.some(w => w.word === newWord.word)) {
        setNewWords([...newWords, newWord]);
      }
    }
  };

  const handleNextExercise = () => {
    setHasChecked(false);
    setSelectedOption("");
    setScrambledSelected([]);
    setBlankInput("");
    setMatchedPairs({});
    setWritingInput("");
    setAiFeedback(null);

    if (currentIdx + 1 < lesson.exercises.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleFinishLesson = () => {
    onComplete(lesson.vocabulary?.length ? lesson.vocabulary : newWords);
  };

  const handleContinueJourney = async () => {
    if (!onContinueToNextLesson || continuingJourney) {
      if (!onContinueToNextLesson) handleFinishLesson();
      return;
    }
    setContinuingJourney(true);
    setJourneyError(null);
    try {
      await onContinueToNextLesson(lesson.vocabulary?.length ? lesson.vocabulary : newWords);
    } catch (error: any) {
      setJourneyError(error?.message || "Não foi possível criar sua próxima missão agora. Tente novamente.");
    } finally {
      setContinuingJourney(false);
    }
  };

  const progressPercent = ((currentIdx) / lesson.exercises.length) * 100;
  const avatarObj = AVATARS[profile.avatar];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* Top Header */}
      <header className="bg-white border-b-2 border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 w-full max-w-lg">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            id="lesson-exit-btn"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
              <span>{lesson.title}</span>
              <span>{currentIdx + 1} / {lesson.exercises.length}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pl-4">
          <span className="text-amber-500 text-sm font-black flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            ⭐ {lesson.xpReward} XP
          </span>
        </div>
      </header>

      {levelUp && (
        <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-md rounded-2xl bg-indigo-600 p-4 text-center text-white shadow-xl">
          <p className="font-black">🚀 Você subiu para o Nível {levelUp}!</p>
          <p className="mt-1 text-xs font-bold text-indigo-100">{getLevelTitle(levelUp)}</p>
          <button type="button" onClick={() => setLevelUp(null)} className="mt-2 text-xs font-black underline">Continuar missão</button>
        </div>
      )}

      {/* Main Lesson Body */}
      {!showSummary ? (
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col justify-center">
          
          {/* Active Companion Helper */}
          <div className="flex items-start gap-4 mb-8 bg-sky-50/50 border border-sky-100 rounded-2xl p-4 shadow-sm">
            <span className="text-4xl md:text-5xl animate-bounce mt-1">{avatarObj.icon}</span>
            <div className="flex-1">
              <span className="text-xs font-black text-sky-800 tracking-wider uppercase block">{avatarObj.name} diz:</span>
              <p className="text-sm md:text-base font-bold text-sky-950 mt-0.5 leading-relaxed">
                {exercise.prompt}
              </p>
              {exercise.translationContext && (
                <p className="text-xs text-slate-500 font-medium mt-1">
                  💡 {exercise.translationContext}
                </p>
              )}
            </div>
          </div>

          {/* Exercise Elements */}
          <div className="flex-1 flex flex-col justify-center min-h-[250px]" id="exercise-workspace">
            
            {/* Pronunciation block if speaking text exists */}
            {exercise.audioText && (
              <div className="flex justify-center mb-6">
                <button
                  type="button"
                  onClick={() => speakEnglish(exercise.audioText!)}
                  className="p-5 bg-sky-100 text-sky-600 rounded-full hover:bg-sky-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center shadow-md border-2 border-sky-200"
                  title="Ouvir pronúncia"
                  id="speak-exercise-btn"
                >
                  <Volume2 className="w-8 h-8 animate-pulse" />
                </button>
              </div>
            )}

            {/* Exercise Types UI */}
            
            {/* 1. Multiple Choice */}
            {exercise.type === "multiple-choice" && exercise.options && (
              <div className="grid grid-cols-1 gap-3">
                {exercise.options.map((option) => {
                  const isSelected = selectedOption === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={hasChecked}
                      onClick={() => {
                        setSelectedOption(option);
                        speakEnglish(option);
                      }}
                      className={`w-full p-4 md:p-5 rounded-2xl border-3 text-left font-extrabold transition-all cursor-pointer flex items-center justify-between text-base ${
                        isSelected 
                          ? "border-sky-400 bg-sky-50 text-sky-900 shadow-md scale-[1.01]" 
                          : "border-slate-100 bg-white hover:border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <span className="w-6 h-6 bg-sky-400 rounded-full flex items-center justify-center text-white text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Scrambled Words Sentence builder */}
            {exercise.type === "arrange-words" && exercise.options && (
              <div className="flex flex-col items-center">
                
                {/* Visual slot where words go */}
                <div className="w-full min-h-[70px] border-b-3 border-slate-200 py-3 mb-8 flex flex-wrap gap-2 justify-center items-center bg-slate-50/30 rounded-xl">
                  {scrambledSelected.length === 0 ? (
                    <span className="text-slate-400 font-bold text-sm">Toque nas palavras abaixo na ordem certa!</span>
                  ) : (
                    scrambledSelected.map((word) => (
                      <button
                        key={word}
                        type="button"
                        disabled={hasChecked}
                        onClick={() => toggleScrambleWord(word)}
                        className="py-2.5 px-4 bg-white border-2 border-sky-200 rounded-xl font-bold text-sm text-sky-900 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {word} <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>

                {/* Pool of words */}
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {exercise.options.map((word) => {
                    const isUsed = scrambledSelected.includes(word);
                    return (
                      <button
                        key={word}
                        type="button"
                        disabled={hasChecked || isUsed}
                        onClick={() => {
                          toggleScrambleWord(word);
                          speakEnglish(word);
                        }}
                        className={`py-3 px-5 rounded-xl font-extrabold text-sm border-2 shadow-sm transition-all cursor-pointer ${
                          isUsed 
                            ? "bg-slate-100 border-slate-100 text-slate-300 pointer-events-none" 
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Fill in the Blank */}
            {exercise.type === "fill-blank" && exercise.options && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8 bg-sky-50/50 px-6 py-4 rounded-2xl border border-sky-100 w-full max-w-md justify-center">
                  <span className="font-extrabold text-lg text-sky-950">
                    I
                  </span>
                  <span className="px-4 py-2 bg-white border-2 border-dashed border-sky-300 rounded-xl font-black text-sky-600 min-w-[70px] text-center shadow-inner">
                    {blankInput || "___"}
                  </span>
                  <span className="font-extrabold text-lg text-sky-950">
                    {exercise.prompt.includes("years old") ? "ten years old." : "..."}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                  {exercise.options.map((option) => {
                    const isSelected = blankInput === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={hasChecked}
                        onClick={() => {
                          setBlankInput(option);
                          speakEnglish(option);
                        }}
                        className={`p-4 rounded-xl border-2 font-black text-sm text-center shadow-sm transition-all cursor-pointer ${
                          isSelected 
                            ? "border-sky-400 bg-sky-50 text-sky-900 scale-102" 
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Match Pairs */}
            {exercise.type === "match-pairs" && exercise.leftPairs && exercise.rightPairs && (
              <div className="grid grid-cols-2 gap-4 w-full">
                
                {/* English Column */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-black text-xs text-slate-400 uppercase text-center mb-1">Inglês</h3>
                  {exercise.leftPairs.map((word) => {
                    const isMatched = !!matchedPairs[word];
                    const isSelected = selectedLeft === word;
                    return (
                      <button
                        key={word}
                        type="button"
                        disabled={isMatched || hasChecked}
                        onClick={() => handleLeftClick(word)}
                        className={`p-3 rounded-xl border-2 font-bold text-sm text-center transition-all ${
                          isMatched 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 line-through" 
                            : isSelected 
                              ? "bg-sky-100 border-sky-400 text-sky-800 scale-102" 
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                {/* Portuguese Column */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-black text-xs text-slate-400 uppercase text-center mb-1">Português</h3>
                  {exercise.rightPairs.map((word) => {
                    const isMatched = Object.values(matchedPairs).includes(word);
                    const isSelected = selectedRight === word;
                    return (
                      <button
                        key={word}
                        type="button"
                        disabled={isMatched || hasChecked}
                        onClick={() => handleRightClick(word)}
                        className={`p-3 rounded-xl border-2 font-bold text-sm text-center transition-all ${
                          isMatched 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 line-through" 
                            : isSelected 
                              ? "bg-sky-100 border-sky-400 text-sky-800 scale-102" 
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. AI Writing Challenge */}
            {exercise.type === "writing-challenge" && (
              <div className="flex flex-col w-full max-w-lg mx-auto">
                <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 mb-4">
                  <span className="text-xs font-bold text-sky-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> MISSÃO DA ESCRITA MÁGICA (IA)
                  </span>
                  <p className="font-extrabold text-sm text-sky-950 mt-1 leading-relaxed">
                    {exercise.writingPrompt}
                  </p>
                </div>

                <textarea
                  id="writing-challenge-input"
                  rows={3}
                  value={writingInput}
                  disabled={hasChecked || aiLoading}
                  onChange={(e) => setWritingInput(e.target.value)}
                  placeholder="Escreva sua frase em inglês aqui..."
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-sky-400 bg-white font-medium text-slate-700 placeholder:text-slate-400 text-sm md:text-base leading-relaxed"
                />

                {!hasChecked && (
                  <button
                    type="button"
                    id="submit-writing-ai"
                    disabled={!writingInput.trim() || aiLoading}
                    onClick={checkWritingWithAI}
                    className="mt-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-200 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    {aiLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        A IA está lendo sua frase...
                      </span>
                    ) : (
                      <>
                        Enviar para Corretor de IA <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {/* AI Structured feedback show inside challenge workspace */}
                {aiFeedback && (
                  <div className={`mt-4 p-5 rounded-2xl border-2 ${aiFeedback.isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-spin" />
                      <h4 className="font-black text-sm text-slate-800">Feedback Mágico de {avatarObj.name}</h4>
                    </div>
                    
                    <p className="text-sm font-bold text-slate-800">{aiFeedback.celebration}</p>
                    
                    {aiFeedback.corrections && aiFeedback.corrections.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-black text-amber-800">Dicas e Correções:</span>
                        <ul className="list-disc pl-4 mt-1 text-slate-600 space-y-0.5">
                          {aiFeedback.corrections.map((corr: string, i: number) => (
                            <li key={i}>{corr}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 block uppercase">Versão nativa:</span>
                      <p className="font-extrabold text-sm text-indigo-600 mt-0.5">{aiFeedback.improvedVersion}</p>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 mt-3 leading-relaxed">
                      💡 {aiFeedback.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      ) : (
        // LESSON SUMMARY CELEBRATION
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-emerald-50 to-white">
          <span className="text-8xl mb-6 animate-bounce">🎉</span>
          <h1 className="text-3xl md:text-4xl font-black text-emerald-950">
            Você é Demais!
          </h1>
          <p className="text-slate-500 font-bold text-base mt-2 max-w-md">
            Você concluiu com sucesso a lição <span className="text-emerald-600">"{lesson.title}"</span>!
          </p>

          <div className="my-8 flex gap-4 w-full max-w-sm justify-center">
            {/* XP earned box */}
            <div className="flex-1 p-5 bg-white border-3 border-amber-200 rounded-2xl shadow-sm flex flex-col items-center">
              <span className="text-4xl">⭐</span>
              <span className="font-black text-xl text-amber-600 mt-1">+{earnedXp} XP</span>
              <span className="text-xs font-bold text-slate-400 mt-0.5">Pontos por acertos</span>
            </div>
            
            {/* Streak count box */}
            <div className="flex-1 p-5 bg-white border-3 border-orange-200 rounded-2xl shadow-sm flex flex-col items-center">
              <span className="text-4xl animate-pulse">🔥</span>
              <span className="font-black text-xl text-orange-500 mt-1">+{profile.streak} dia</span>
              <span className="text-xs font-bold text-slate-400 mt-0.5">Sequência Diária</span>
            </div>
          </div>

          <div className="w-full max-w-md bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-xs mb-8">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5 justify-center">
              💬 Vocabulário Adicionado
            </h4>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {lesson.exercises.filter(e => e.audioText).map((e) => (
                <span key={e.id} className="py-1 px-3 bg-sky-50 text-sky-700 font-bold text-xs rounded-full border border-sky-100">
                  {e.audioText}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <button
              type="button"
              id="lesson-summary-continue"
              onClick={handleContinueJourney}
              disabled={continuingJourney}
              className="w-full py-4 bg-emerald-400 hover:bg-emerald-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all"
            >
              {continuingJourney ? <>Preparando sua próxima missão... <Sparkles className="w-5 h-5" /></> : nextLesson ? <>Próxima missão: {nextLesson.title} <Play className="w-5 h-5 fill-current" /></> : <>Criar próxima missão <Sparkles className="w-5 h-5" /></>}
            </button>
            {journeyError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {journeyError}
              </p>
            )}
            <button
              type="button"
              id="lesson-summary-home"
              onClick={handleFinishLesson}
              className="w-full py-3 text-slate-500 hover:text-slate-700 font-black rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              Ver mapa de missões <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer / Check Answer Drawer */}
      {!showSummary && (
        <footer className={`bg-white border-t-2 border-slate-100 p-4 sticky bottom-0 z-40 transition-all ${
          hasChecked 
            ? isAnswerCorrect 
              ? "bg-emerald-50/95" 
              : "bg-red-50/95" 
            : ""
        }`}>
          <div className="w-full max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Feedback details */}
            {hasChecked ? (
              <div className="flex items-start gap-3 flex-1">
                {isAnswerCorrect ? (
                  <>
                    <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm animate-bounce">
                      <Check className="w-6 h-6 stroke-[3px]" />
                    </div>
                    <div>
                      <h4 className="font-black text-emerald-800 text-base leading-tight">Incrível! Resposta certa!</h4>
                      <p className="text-emerald-700 text-xs font-semibold mt-0.5">Continue com esse brilho nos estudos!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                      <X className="w-6 h-6 stroke-[3px]" />
                    </div>
                    <div>
                      <h4 className="font-black text-red-800 text-base leading-tight">Ops! Resposta incorreta!</h4>
                      <p className="text-red-700 text-xs font-semibold mt-0.5">
                        {exercise.type !== "writing-challenge" && (
                          <span>Gabarito correto: <span className="font-bold underline">
                            {exercise.type === "match-pairs" 
                              ? exercise.leftPairs?.map((left, idx) => `${left} = ${exercise.rightPairs![idx]}`).join(" | ")
                              : Array.isArray(exercise.correctAnswer) ? exercise.correctAnswer.join(", ") : exercise.correctAnswer}
                          </span></span>
                        )}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                          Sem XP nesta tentativa
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-xs font-bold hidden md:block">
                Selecione ou escreva a resposta correta e aperte em "Verificar"!
              </div>
            )}

            {/* Actions button */}
            <div className="w-full md:w-auto flex justify-end">
              {!hasChecked ? (
                <button
                  type="button"
                  id="lesson-check-btn"
                  disabled={
                    (exercise.type === "multiple-choice" && !selectedOption) ||
                    (exercise.type === "arrange-words" && scrambledSelected.length === 0) ||
                    (exercise.type === "fill-blank" && !blankInput) ||
                    (exercise.type === "match-pairs" && Object.keys(matchedPairs).length !== (exercise.leftPairs?.length || 0)) ||
                    (exercise.type === "writing-challenge")
                  }
                  onClick={handleCheckAnswer}
                  className="w-full md:w-44 py-4 bg-sky-400 hover:bg-sky-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-2xl cursor-pointer text-base transition-all shadow-md"
                >
                  Verificar
                </button>
              ) : (
                <button
                  type="button"
                  id="lesson-next-btn"
                  onClick={handleNextExercise}
                  className={`w-full md:w-44 py-4 font-black rounded-2xl cursor-pointer text-base transition-all shadow-md text-white ${
                    isAnswerCorrect ? "bg-emerald-400 hover:bg-emerald-501" : "bg-red-400 hover:bg-red-501"
                  }`}
                >
                  Continuar
                </button>
              )}
            </div>

          </div>
        </footer>
      )}

    </div>
  );
}
