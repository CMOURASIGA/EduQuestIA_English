import React, { useState } from "react";
import { VocabularyItem } from "../types";
import { Volume2, Star, Sparkles, Check, ChevronLeft, ChevronRight, BookOpen, Trash2 } from "lucide-react";

interface VocabularyTrainerProps {
  vocabulary: VocabularyItem[];
  onUpdateVocabulary: (updated: VocabularyItem[]) => void;
  onAddWord: (word: Omit<VocabularyItem, "id" | "learnedAt">) => void;
}

const speakEnglish = (text: string) => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
};

export default function VocabularyTrainer({ vocabulary, onUpdateVocabulary, onAddWord }: VocabularyTrainerProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  
  // Custom manual vocabulary insertion
  const [newWord, setNewWord] = useState<string>("");
  const [newTranslation, setNewTranslation] = useState<string>("");
  const [newExample, setNewExample] = useState<string>("");
  const [newExampleTranslation, setNewExampleTranslation] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Geral");
  const [showForm, setShowForm] = useState<boolean>(false);

  // Filter vocabulary by category
  const filteredVocabulary = vocabulary.filter(
    (v) => activeCategory === "todos" || v.category.toLowerCase() === activeCategory.toLowerCase()
  );

  const categories = ["todos", ...Array.from(new Set(vocabulary.map((v) => v.category.toLowerCase())))];

  const currentItem = filteredVocabulary[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex + 1 < filteredVocabulary.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // wrap around
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(filteredVocabulary.length - 1);
    }
  };

  const updateMastery = (itemId: string, rating: number) => {
    const updated = vocabulary.map((v) => {
      if (v.id === itemId) {
        return { ...v, mastery: rating };
      }
      return v;
    });
    onUpdateVocabulary(updated);
  };

  const deleteWord = (itemId: string) => {
    const updated = vocabulary.filter((v) => v.id !== itemId);
    onUpdateVocabulary(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;

    onAddWord({
      word: newWord.trim(),
      translation: newTranslation.trim(),
      example: newExample.trim() || "This is " + newWord.trim(),
      exampleTranslation: newExampleTranslation.trim() || "Isto é " + newTranslation.trim(),
      category: newCategory.trim() || "Geral",
      mastery: 5
    });

    // Reset Form
    setNewWord("");
    setNewTranslation("");
    setNewExample("");
    setNewExampleTranslation("");
    setShowForm(false);
    setCurrentIndex(vocabulary.length); // go to newly added card
  };

  return (
    <div className="flex flex-col gap-6" id="vocabulary-workspace">
      
      {/* Category selector row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`py-1.5 px-3.5 rounded-full font-bold text-xs border-2 uppercase tracking-wide transition-all cursor-pointer ${
                activeCategory === cat 
                  ? "border-sky-400 bg-sky-50 text-sky-800" 
                  : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
              }`}
            >
              {cat === "todos" ? "📁 Todos" : `🔖 ${cat}`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="py-1.5 px-4 bg-sky-100 hover:bg-sky-200 text-sky-700 font-extrabold text-xs rounded-xl border border-sky-200 transition-all cursor-pointer"
        >
          {showForm ? "Cancelar" : "+ Adicionar Palavra"}
        </button>
      </div>

      {/* Manual Insert Form */}
      {showForm && (
        <form onSubmit={handleManualAdd} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-4 shadow-inner">
          <h4 className="col-span-1 md:col-span-2 font-black text-slate-800 text-xs flex items-center gap-1.5">
            📝 Adicionar Palavra ao Meu Baú de Vocabulário
          </h4>
          
          <div>
            <label className="block text-slate-500 font-bold mb-1">Palavra em Inglês:</label>
            <input
              type="text"
              required
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Ex: Dog"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Tradução em Português:</label>
            <input
              type="text"
              required
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              placeholder="Ex: Cachorro"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Frase de Exemplo (Inglês):</label>
            <input
              type="text"
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              placeholder="Ex: I love my dog."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Tradução do Exemplo:</label>
            <input
              type="text"
              value={newExampleTranslation}
              onChange={(e) => setNewExampleTranslation(e.target.value)}
              placeholder="Ex: Eu amo meu cachorro."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Categoria:</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Animais, Cumprimentos, Cores"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none font-bold"
            />
          </div>

          <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
            <button
              type="submit"
              className="py-2.5 px-5 bg-sky-400 hover:bg-sky-501 text-white font-black rounded-xl cursor-pointer shadow-md"
            >
              Confirmar Adição
            </button>
          </div>
        </form>
      )}

      {/* Main Flashcard Deck */}
      {currentItem ? (
        <div className="flex flex-col items-center">
          
          {/* Card Frame */}
          <div 
            onClick={() => {
              setIsFlipped(!isFlipped);
              if (!isFlipped) speakEnglish(currentItem.word);
            }}
            className={`w-full max-w-md h-[250px] rounded-3xl border-3 shadow-sm cursor-pointer select-none transition-all duration-300 flex flex-col items-center justify-center p-6 text-center ${
              isFlipped 
                ? "border-amber-200 bg-amber-50/50 scale-[1.01]" 
                : "border-sky-100 bg-white hover:border-sky-200"
            }`}
            id="flashcard-element"
          >
            {/* Front Card */}
            {!isFlipped ? (
              <div className="flex flex-col items-center gap-4">
                <span className="px-3 py-1 bg-sky-50 text-sky-700 font-black text-[10px] rounded-full border border-sky-100 uppercase tracking-wider">
                  {currentItem.category}
                </span>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">{currentItem.word}</h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent flip
                    speakEnglish(currentItem.word);
                  }}
                  className="p-3 bg-sky-100 hover:bg-sky-200 text-sky-600 rounded-full transition-all flex items-center justify-center border border-sky-100"
                  title="Ouvir pronúncia"
                >
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </button>
                <span className="text-xs text-slate-400 font-bold mt-2">Toque no cartão para ver a tradução! 👉</span>
              </div>
            ) : (
              // Back Card
              <div className="flex flex-col items-center gap-2 w-full">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 font-black text-[10px] rounded-full border border-amber-200 uppercase tracking-wider">
                  Tradução
                </span>
                <h2 className="text-3xl font-black text-amber-950 tracking-tight">{currentItem.translation}</h2>
                
                {/* Example sentence */}
                <div className="mt-4 bg-white/70 p-3 rounded-xl border border-amber-200/50 max-w-xs text-center">
                  <p className="font-extrabold text-sm text-slate-800 flex items-center justify-center gap-1">
                    "{currentItem.example}" 
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakEnglish(currentItem.example);
                      }}
                      className="text-sky-500 hover:text-sky-600 shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">"{currentItem.exampleTranslation}"</p>
                </div>
                
                <span className="text-xs text-amber-600 font-bold mt-2">Toque novamente para voltar! 🔄</span>
              </div>
            )}

          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-6 mt-6 w-full max-w-sm justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer shadow-xs font-bold flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-slate-400 font-black text-xs">
              Carta {currentIndex + 1} de {filteredVocabulary.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer shadow-xs font-bold flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Card Star Mastery rating and card management */}
          <div className="mt-8 bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full max-w-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-black uppercase block">Grau de Domínio:</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateMastery(currentItem.id, star)}
                    className="p-0.5 hover:scale-110 transition-all cursor-pointer"
                  >
                    <Star 
                      className={`w-5 h-5 ${
                        star <= currentItem.mastery 
                          ? "fill-amber-400 stroke-amber-500" 
                          : "stroke-slate-300"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => deleteWord(currentItem.id)}
              className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-inner"
            >
              <Trash2 className="w-3.5 h-3.5" /> Deletar Palavra
            </button>
          </div>

        </div>
      ) : (
        <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center">
          <BookOpen className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
          <h3 className="font-extrabold text-slate-600 text-sm">Nenhuma palavra cadastrada</h3>
          <p className="text-slate-400 text-xs mt-1">Complete as lições na Trilha ou adicione manualmente novas palavras acima!</p>
        </div>
      )}

    </div>
  );
}
