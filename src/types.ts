export type AvatarType = "bunny" | "bear" | "fox" | "lion";
export type AgeGroupType = "kids" | "teens";

export interface UserProfile {
  id: string;
  displayName: string;
  avatar: AvatarType;
  profileEmoji: string;
  ageGroup: AgeGroupType;
  /** Age is used only to calibrate the learning missions. */
  age?: number;
  goal: string;
  dailyMinutes: number;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedLessons: string[];
  vocabularyCount: number;
  password?: string;
}

export type ExerciseType = 
  | "multiple-choice" 
  | "arrange-words" 
  | "fill-blank" 
  | "match-pairs" 
  | "writing-challenge";

export interface Exercise {
  id: string;
  type: ExerciseType;
  prompt: string; // The question or instruction
  audioText?: string; // Text to speak aloud via SpeechSynthesis (English)
  options?: string[]; // Multiple choice or word options to arrange
  correctAnswer: string | string[]; // Correct answer text or structured answer
  leftPairs?: string[]; // Match pairs: English words (e.g., ["Hello", "Blue", "Cat"])
  rightPairs?: string[]; // Match pairs: Translation (e.g., ["Olá", "Azul", "Gato"])
  writingPrompt?: string; // Challenge instruction for AI writing feedback
  translationContext?: string; // Translation helper
}

export interface Lesson {
  id: string;
  unitId: string;
  unitTitle: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  xpReward: number;
  exercises: Exercise[];
  /** Words proposed by the Professor EduQuest. They enter the Baú after completion. */
  vocabulary?: Omit<VocabularyItem, "id" | "learnedAt" | "mastery">[];
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  category: string;
  mastery: number; // 1 to 5 stars
  learnedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface WritingFeedback {
  isCorrect: boolean;
  celebration: string;
  corrections: string[];
  improvedVersion: string;
  explanation: string;
}
