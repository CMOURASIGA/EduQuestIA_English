/**
 * SpaceAcademy Progressive & Infinite Level Utility
 * 
 * Formula:
 * To reach the next level from level L, the cumulative XP required is:
 * CumulativeXP(next) = L * 100 + L * (L - 1) * 50
 * 
 * This means:
 * - Level 1: 0 XP
 * - Level 2: 100 XP (Needs 100 XP from Lvl 1)
 * - Level 3: 300 XP (Needs 200 XP from Lvl 2)
 * - Level 4: 600 XP (Needs 300 XP from Lvl 3)
 * - Level 5: 1000 XP (Needs 400 XP from Lvl 4)
 * - Level 6: 1500 XP (Needs 500 XP from Lvl 5)
 * - Level 7: 2100 XP (Needs 600 XP from Lvl 6)
 * and so on...
 */

export interface LevelProgress {
  level: number;
  currentLevelCumulativeXp: number;
  nextLevelCumulativeXp: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  xpPercentage: number;
  xpRemaining: number;
}

/** Cumulative XP required to reach (enter) a given level. Exported so any
 * screen that needs to display level thresholds (e.g. the Journey Guide)
 * reads them from a single source instead of re-deriving the formula and
 * drifting out of sync with it. */
export function getCumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * 100 + (level - 1) * (level - 2) * 50;
}

export function getLevelAndProgress(xp: number): LevelProgress {
  let level = 1;
  while (xp >= getCumulativeXpForLevel(level + 1)) {
    level++;
  }

  const currentLevelCumulativeXp = getCumulativeXpForLevel(level);
  const nextLevelCumulativeXp = getCumulativeXpForLevel(level + 1);

  const xpInCurrentLevel = xp - currentLevelCumulativeXp;
  const xpNeededForNextLevel = nextLevelCumulativeXp - currentLevelCumulativeXp;
  const xpPercentage = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100));
  const xpRemaining = nextLevelCumulativeXp - xp;

  return {
    level,
    currentLevelCumulativeXp,
    nextLevelCumulativeXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    xpPercentage,
    xpRemaining,
  };
}

export function getLevelTitle(level: number): string {
  if (level === 1) return "Recruta do Espaço 🛰️";
  if (level === 2) return "Piloto de Aprendizado 🚀";
  if (level === 3) return "Explorador das Estrelas 🪐";
  if (level === 4) return "Astronauta Fluente ☄️";
  if (level === 5) return "Guardião do Cosmos 🌟";
  if (level === 6) return "Navegador do Hiperespaço 🌌";
  if (level === 7) return "Cartógrafo de Galáxias 🗺️";
  if (level === 8) return "Embaixador de Órbitas 🛰️";
  if (level === 9) return "Cavaleiro de Andrômeda ⚔️";
  if (level === 10) return "Mestre da Gravidade 🛸";
  if (level >= 11 && level <= 14) return `Lorde Interestelar Lvl ${level} 👑`;
  if (level >= 15 && level <= 19) return `Mago das Constelações Lvl ${level} 🔮`;
  return `Lenda do Multiverso Lvl ${level} 💎`;
}

export function getLevelPerk(level: number): string {
  if (level === 1) return "Início da jornada espacial! Desbloqueie as primeiras ilhas de vocabulário e aprenda a se apresentar em inglês.";
  if (level === 2) return "Papo mais solto com o Tutor de IA! Pip, Barnaby, Fiona ou Leo já trocam ideia com você sobre gírias e temas do dia a dia.";
  if (level === 3) return "Você já manda bem na Escrita Mágica! A IA passa a te dar dicas mais detalhadas nas frases que você mesmo escreve.";
  if (level === 4) return "Prática de pronúncia ativa! Seu vocabulário cresce e o Tutor estimula frases completas.";
  if (level === 5) return "Fluência básica alcançada! Você já consegue pedir comidas, falar de amigos e hobbies com confiança.";
  if (level === 6) return "O Tutor IA sobe o nível! Ele usará um inglês mais intermediário e fará perguntas mais elaboradas.";
  if (level === 7) return "Expressões idiomáticas ativas! Aprenda termos reais que nativos usam no dia a dia.";
  if (level === 8) return "Viagem no tempo gramatical! Desbloqueie desafios focados em passado e futuro em inglês.";
  if (level === 9) return "Construção de opinião! Escreva frases argumentando o porquê de suas decisões.";
  if (level === 10) return "Conversação 90% em inglês! O Tutor desafiará você com diálogos fluidos quase sem português.";
  if (level >= 11 && level <= 14) return "Nível avançado em progresso! Desafios de escrita de parágrafos completos com feedbacks enriquecedores.";
  if (level >= 15 && level <= 19) return "Excelência de escrita! Aprenda sinônimos refinados e evite repetição de palavras básicas.";
  return "Nível de Conversação Fluente alcançado! Desafios gerados infinitamente por IA e diálogo dinâmico nativo.";
}
