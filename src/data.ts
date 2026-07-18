import { Lesson, VocabularyItem } from "./types";

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: "greetings",
    unitId: "unit-1",
    unitTitle: "Unidade 1: Primeiros Passos",
    title: "Cumprimentos & Apresentação",
    description: "Aprenda a dizer olá, falar o seu nome e sua idade em inglês de forma super fácil!",
    icon: "👋",
    xpReward: 100,
    exercises: [
      {
        id: "greet-mc-1",
        type: "multiple-choice",
        prompt: "Como você diz 'Olá' em inglês?",
        audioText: "Hello!",
        options: ["Goodbye", "Hello", "Thank you"],
        correctAnswer: "Hello",
        translationContext: "Dica: É a forma mais comum de cumprimentar alguém!"
      },
      {
        id: "greet-arr-1",
        type: "arrange-words",
        prompt: "Coloque as palavras na ordem correta para dizer 'Meu nome é Bob':",
        audioText: "My name is Bob.",
        options: ["Bob", "is", "My", "name"],
        correctAnswer: "My name is Bob",
        translationContext: "Dica: Em inglês começamos com 'My name...'"
      },
      {
        id: "greet-fb-1",
        type: "fill-blank",
        prompt: "Complete a frase para dizer 'Eu tenho 10 anos de idade': 'I ___ ten years old.'",
        audioText: "I am ten years old.",
        options: ["is", "am", "are"],
        correctAnswer: "am",
        translationContext: "Dica: Com 'I' sempre usamos 'am'!"
      },
      {
        id: "greet-match-1",
        type: "match-pairs",
        prompt: "Combine as palavras em inglês com suas traduções correspondentes:",
        correctAnswer: [], // Evaluated dynamically for match-pairs
        leftPairs: ["Hi", "Nice to meet you", "Goodbye", "Please"],
        rightPairs: ["Oi", "Prazer em conhecer você", "Tchau", "Por favor"],
        translationContext: "Dica: Arraste ou clique nos pares correspondentes para ligá-los!"
      },
      {
        id: "greet-write-1",
        type: "writing-challenge",
        prompt: "Escreva uma pequena frase se apresentando em inglês com o seu nome real ou inventado!",
        writingPrompt: "Write a sentence introducing yourself in English (e.g. 'Hello, my name is Alex and I am happy').",
        correctAnswer: "", // Evaluated by AI API
        translationContext: "Use a estrutura: 'Hello, my name is... and I am... years old' ou diga apenas seu nome!"
      }
    ]
  },
  {
    id: "colors-emotions",
    unitId: "unit-1",
    unitTitle: "Unidade 1: Primeiros Passos",
    title: "Cores & Sentimentos",
    description: "Aprenda a dizer suas cores favoritas e expressar como você está se sentindo hoje!",
    icon: "🎨",
    xpReward: 120,
    exercises: [
      {
        id: "color-mc-1",
        type: "multiple-choice",
        prompt: "Como dizemos 'Azul' em inglês?",
        audioText: "Blue!",
        options: ["Red", "Blue", "Green"],
        correctAnswer: "Blue",
        translationContext: "Dica: É a cor do céu em um lindo dia ensolarado!"
      },
      {
        id: "color-fb-1",
        type: "fill-blank",
        prompt: "Complete para dizer 'Eu me sinto muito feliz hoje!': 'I feel very ___ today!'",
        audioText: "I feel very happy today!",
        options: ["happy", "sad", "angry"],
        correctAnswer: "happy",
        translationContext: "Dica: 'Happy' é o oposto de 'Sad'!"
      },
      {
        id: "color-arr-1",
        type: "arrange-words",
        prompt: "Coloque as palavras em ordem para dizer 'A maçã é vermelha':",
        audioText: "The apple is red.",
        options: ["apple", "red", "The", "is"],
        correctAnswer: "The apple is red",
        translationContext: "Dica: Em inglês colocamos o artigo 'The' no início da frase."
      },
      {
        id: "color-match-1",
        type: "match-pairs",
        prompt: "Combine as cores e sentimentos correspondentes:",
        correctAnswer: [],
        leftPairs: ["Yellow", "Red", "Sad", "Angry"],
        rightPairs: ["Amarelo", "Vermelho", "Triste", "Bravo"],
        translationContext: "Combine todos os pares para ganhar pontos!"
      },
      {
        id: "color-write-1",
        type: "writing-challenge",
        prompt: "Escreva como você está se sentindo e qual sua cor favorita em inglês!",
        writingPrompt: "Write about how you feel and your favorite color (e.g. 'I feel happy and my favorite color is blue').",
        correctAnswer: "",
        translationContext: "Exemplo: 'I am happy. My favorite color is green.'"
      }
    ]
  },
  {
    id: "animals",
    unitId: "unit-1",
    unitTitle: "Unidade 1: Primeiros Passos",
    title: "Animais Fofinhos",
    description: "Conheça os animais de estimação e os animais selvagens mais divertidos em inglês!",
    icon: "🐶",
    xpReward: 150,
    exercises: [
      {
        id: "anim-mc-1",
        type: "multiple-choice",
        prompt: "Como dizemos 'Gato' em inglês?",
        audioText: "Cat!",
        options: ["Dog", "Cat", "Bird"],
        correctAnswer: "Cat",
        translationContext: "Dica: Eles fazem 'miau'!"
      },
      {
        id: "anim-arr-1",
        type: "arrange-words",
        prompt: "Coloque as palavras na ordem correta para dizer 'O urso é marrom':",
        audioText: "The bear is brown.",
        options: ["brown", "is", "The", "bear"],
        correctAnswer: "The bear is brown",
        translationContext: "Dica: Urso é 'bear' e marrom é 'brown'!"
      },
      {
        id: "anim-fb-1",
        type: "fill-blank",
        prompt: "Complete para dizer 'O pássaro pode voar': 'The ___ can fly.'",
        audioText: "The bird can fly.",
        options: ["lion", "bird", "fish"],
        correctAnswer: "bird",
        translationContext: "Dica: Pássaros têm asas e cantam alegremente!"
      },
      {
        id: "anim-match-1",
        type: "match-pairs",
        prompt: "Combine os animais em inglês com sua tradução em português:",
        correctAnswer: [],
        leftPairs: ["Dog", "Lion", "Bear", "Rabbit"],
        rightPairs: ["Cachorro", "Leão", "Urso", "Coelho"],
        translationContext: "Aperte nas caixinhas correspondentes para parear!"
      },
      {
        id: "anim-write-1",
        type: "writing-challenge",
        prompt: "Qual o seu animal de estimação ou animal selvagem favorito? Escreva em inglês!",
        writingPrompt: "Write about your favorite animal in English (e.g. 'My favorite animal is a cat' or 'I like bears').",
        correctAnswer: "",
        translationContext: "Tente usar: 'I love dogs' ou 'My favorite animal is a bear'."
      }
    ]
  }
];

export const INITIAL_VOCABULARY: VocabularyItem[] = [
  {
    id: "v-hello",
    word: "Hello",
    translation: "Olá",
    example: "Hello, my friend!",
    exampleTranslation: "Olá, meu amigo!",
    category: "Greetings",
    mastery: 5,
    learnedAt: new Date().toISOString()
  },
  {
    id: "v-blue",
    word: "Blue",
    translation: "Azul",
    example: "The balloon is blue.",
    exampleTranslation: "O balão é azul.",
    category: "Colors",
    mastery: 3,
    learnedAt: new Date().toISOString()
  },
  {
    id: "v-cat",
    word: "Cat",
    translation: "Gato",
    example: "The cat is happy.",
    exampleTranslation: "O gato está feliz.",
    category: "Animals",
    mastery: 4,
    learnedAt: new Date().toISOString()
  },
  {
    id: "v-happy",
    word: "Happy",
    translation: "Feliz",
    example: "I am happy today.",
    exampleTranslation: "Eu estou feliz hoje.",
    category: "Emotions",
    mastery: 5,
    learnedAt: new Date().toISOString()
  }
];
