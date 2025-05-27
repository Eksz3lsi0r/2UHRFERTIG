// src/state.js
export const state = {
  // initial state for menus
  hasLoadedOnce: false,

  // Authentication state
  isAuthenticated: false,
  isGuest: false,
  accountData: null,

  // Modus / Flags
  currentMode: null,
  gameActive: false,
  cpuGameActive: false,

  // Spieler-Infos
  playerId: null,
  opponentId: null,
  playerName: "Player",
  opponentName: "Gegner",

  // Punkte
  playerScore: 0,
  cpuScore: 0,
  opponentScore: 0,

  // Combo-System für Multiplikatoren (Spieler)
  consecutiveClears: 0,
  lastClearTurn: -1,
  currentMultiplier: 1,

  // Combo-System für CPU
  cpuConsecutiveClears: 0,
  cpuLastClearTurn: -1,
  cpuCurrentMultiplier: 1,
  cpuTurnCounter: 0,

  // Boards & DOM-Arrays
  playerBoard: Array(10)
    .fill(0)
    .map((_) => Array(10).fill(0)),
  cpuBoard: Array(10)
    .fill(0)
    .map((_) => Array(10).fill(0)),
  boardCells: [],
  opponentBoardCells: [],

  // Inventare
  playerPieces: [],
  cpuPieces: [],

  // Diverse Laufvariablen
  currentDragShape: null,
  currentDragOffset: { x: 0, y: 0 },
  countdownInterval: null,
  timeLeft: 0,
  opponentFinished: false, // Flag für PVP: Gegner hat kein Züge mehr
  opponentFinalScore: 0, // Finale Punktzahl des Gegners im PVP

  // Domänenübergreifende Sprache
  currentLanguage: "de",
  // CPU-Schwierigkeitsgrad
  cpuDifficulty: "easy", // "easy", "medium", "hard"
  // DOM-Referenzen (füllen wir später in ui.js)
  el: {},
};
