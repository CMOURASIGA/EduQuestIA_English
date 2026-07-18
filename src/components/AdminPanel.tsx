import React, { useState } from "react";
import { Lesson, Exercise, ExerciseType } from "../types";
import { Plus, Trash2, Edit2, RotateCcw, FileJson, Check, Star, Settings, ShieldAlert } from "lucide-react";

interface AdminPanelProps {
  lessons: Lesson[];
  onUpdateLessons: (updated: Lesson[]) => void;
  onResetLessons: () => void;
}

export default function AdminPanel({ lessons, onUpdateLessons, onResetLessons }: AdminPanelProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id || "");
  const [editingExId, setEditingExId] = useState<string | null>(null);

  // New Exercise Form State
  const [type, setType] = useState<ExerciseType>("multiple-choice");
  const [prompt, setPrompt] = useState<string>("");
  const [audioText, setAudioText] = useState<string>("");
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [optionsStr, setOptionsStr] = useState<string>(""); // comma separated
  const [translationContext, setTranslationContext] = useState<string>("");

  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson || !prompt || !correctAnswer) return;

    const newExercise: Exercise = {
      id: "custom-" + Math.random().toString(36).substring(7),
      type,
      prompt,
      audioText: audioText || undefined,
      correctAnswer: type === "multiple-choice" || type === "arrange-words" || type === "fill-blank" ? correctAnswer : correctAnswer.split(","),
      options: optionsStr ? optionsStr.split(",").map((s) => s.trim()) : undefined,
      translationContext: translationContext || undefined,
      leftPairs: type === "match-pairs" ? ["Hello", "Dog", "Blue"] : undefined,
      rightPairs: type === "match-pairs" ? ["Olá", "Cachorro", "Azul"] : undefined
    };

    const updatedLessons = lessons.map((l) => {
      if (l.id === selectedLessonId) {
        return { ...l, exercises: [...l.exercises, newExercise] };
      }
      return l;
    });

    onUpdateLessons(updatedLessons);

    // Reset Form
    setPrompt("");
    setAudioText("");
    setCorrectAnswer("");
    setOptionsStr("");
    setTranslationContext("");
  };

  const handleDeleteExercise = (exId: string) => {
    if (!selectedLesson) return;
    const updatedLessons = lessons.map((l) => {
      if (l.id === selectedLessonId) {
        return {
          ...l,
          exercises: l.exercises.filter((ex) => ex.id !== exId)
        };
      }
      return l;
    });
    onUpdateLessons(updatedLessons);
  };

  return (
    <div className="bg-white rounded-3xl border-3 border-slate-100 p-6 shadow-sm" id="admin-panel-container">
      
      {/* Warning Alert */}
      <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 text-rose-950">
        <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <h4 className="font-extrabold text-sm">Área de Supervisão e Administração</h4>
          <p className="text-xs text-rose-800 leading-relaxed mt-0.5">
            Reservado para professores ou pais. Aqui você pode gerenciar as lições do currículo e customizar exercícios para o ritmo da criança. As mudanças serão salvas no seu navegador!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: select lesson */}
        <div className="md:col-span-1 border-r border-slate-100 pr-0 md:pr-6 flex flex-col gap-2">
          <h3 className="font-extrabold text-slate-800 text-sm mb-2">Lições Disponíveis</h3>
          {lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedLessonId(l.id)}
              className={`p-3 rounded-xl text-left font-bold text-xs transition-all flex items-center justify-between ${
                selectedLessonId === l.id 
                  ? "bg-sky-50 text-sky-800 border-2 border-sky-200" 
                  : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              <div>
                <span>{l.title}</span>
                <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{l.exercises.length} Exercícios</span>
              </div>
              <span className="text-lg">{l.icon}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={onResetLessons}
            className="mt-6 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            id="admin-reset-lessons"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
          </button>
        </div>

        {/* Right columns: lists & creation form */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {selectedLesson && (
            <>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
                  Exercícios Atuais em <span className="text-sky-600">"{selectedLesson.title}"</span>
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                  {selectedLesson.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold text-[9px] rounded-md uppercase">
                          {ex.type}
                        </span>
                        <h4 className="font-extrabold text-xs text-slate-800 mt-1">{idx + 1}. {ex.prompt}</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Gabarito: <span className="text-emerald-600 font-bold">{Array.isArray(ex.correctAnswer) ? ex.correctAnswer.join(", ") : ex.correctAnswer}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer"
                        title="Deletar Exercício"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to add custom exercise */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 mb-3">
                  <Plus className="w-4 h-4 text-sky-500 stroke-[3px]" /> Criar Novo Exercício Lúdico
                </h3>

                <form onSubmit={handleAddExercise} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Tipo de Exercício:</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ExerciseType)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold"
                    >
                      <option value="multiple-choice">Múltipla Escolha 🟢</option>
                      <option value="arrange-words">Ordenar Palavras 🧱</option>
                      <option value="fill-blank">Completar Lacuna ✏️</option>
                      <option value="match-pairs">Parear Palavras 🔗</option>
                      <option value="writing-challenge">Desafio Escrita IA ✨</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Enunciado / Pergunta:</label>
                    <input
                      type="text"
                      required
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: Como dizemos 'Bom dia'?"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                    />
                  </div>

                  {type !== "writing-challenge" && (
                    <>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Frase Pronunciada (em Inglês):</label>
                        <input
                          type="text"
                          value={audioText}
                          onChange={(e) => setAudioText(e.target.value)}
                          placeholder="Ex: Good morning"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Resposta Correta:</label>
                        <input
                          type="text"
                          required
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          placeholder="Ex: Good morning"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                        />
                      </div>
                    </>
                  )}

                  {type === "multiple-choice" && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-slate-500 font-bold mb-1">Opções (Separadas por Vírgula):</label>
                      <input
                        type="text"
                        required
                        value={optionsStr}
                        onChange={(e) => setOptionsStr(e.target.value)}
                        placeholder="Ex: Good afternoon, Good morning, Hello"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                      />
                    </div>
                  )}

                  {type === "arrange-words" && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-slate-500 font-bold mb-1">Palavras Embaralhadas (Separadas por Vírgula):</label>
                      <input
                        type="text"
                        required
                        value={optionsStr}
                        onChange={(e) => setOptionsStr(e.target.value)}
                        placeholder="Ex: morning, Good, buddy"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                      />
                    </div>
                  )}

                  {type === "fill-blank" && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-slate-500 font-bold mb-1">Opções de Seleção (Separadas por Vírgula):</label>
                      <input
                        type="text"
                        required
                        value={optionsStr}
                        onChange={(e) => setOptionsStr(e.target.value)}
                        placeholder="Ex: is, am, are"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                      />
                    </div>
                  )}

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-slate-500 font-bold mb-1">Dica Pedagógica do Companion:</label>
                    <input
                      type="text"
                      value={translationContext}
                      onChange={(e) => setTranslationContext(e.target.value)}
                      placeholder="Ex: Começamos o dia com esse cumprimento!"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="col-span-1 md:col-span-2 py-3 bg-sky-400 hover:bg-sky-500 text-white font-black rounded-xl transition-all cursor-pointer shadow-md text-sm mt-2"
                  >
                    Adicionar Exercício ao Currículo
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}
