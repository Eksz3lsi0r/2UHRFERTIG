/* ---------- Shapes ---------------------------------------------------- */
export const BASE_SHAPES = [
  [[0, 0]],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 0],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 1],
  ],
  [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [3, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [2, 2],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [1, 3],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
];
export const ALL_POSSIBLE_SHAPES = [...BASE_SHAPES, ...BASE_SHAPES];

/* ---------- Sprachen -------------------------------------------------- */
export const LANG = {
  de: {
    mainMenuTitle: "Shape Smasher!",
    playerNameLabel: "Spielername:",
    playVsCpuButton: "Spiel gegen Computer",
    playVsPlayerButton: "Spieler gegen Spieler",
    settingsButton: "Einstellungen",
    settingsTitle: "Einstellungen",
    languageLabel: "Sprache:",
    langGerman: "Deutsch",
    langEnglish: "Englisch",
    langFrench: "Französisch",
    graphicsQualityLabel: "Grafikqualität:",
    graphicsLow: "Niedrig",
    graphicsMedium: "Mittel",
    graphicsHigh: "Hoch",
    saveSettingsButton: "Speichern & Zurück",
    backToMainMenuButton: "Zurück zum Hauptmenü",
    waitingForConnection: "Warte auf Verbindung...",
    yourBoard: "Dein Spielfeld",
    opponentBoard: "Gegner Spielfeld",
    scoreLabel: "Score",
    welcomeMessage: "Willkommen! Wähle einen Modus.",
    searchingPlayer: "Suche Spieler...",
    gameStarted: (player, opp) => `${player} gegen ${opp}!`,
    playerVsCPU: (player) => `${player} gegen Computer!`,
    opponentFinishedMsg: (oppName, oppScore, time) =>
      `${oppName} fertig mit ${oppScore} P. • Zeit übrig: <span id=\"timer\">${time}</span>`,
    gameWin: (oppName, pScore, oScore) =>
      `Du hast gewonnen gegen ${oppName} – Endstand ${pScore}:${oScore}`,
    gameLose: (oppName, pScore, oScore) =>
      `Du hast verloren gegen ${oppName} – Endstand ${pScore}:${oScore}`,
    opponentLeftMsg: (oppName) => `${oppName} hat das Spiel verlassen.`,
    rematchRequestedMsg: (oppName) =>
      `${oppName} möchte ein Rematch! Klicke auf Rematch, um zu starten.`,
    waitingForRematchConfirmMsg:
      "Warte auf Bestätigung des Gegners für Rematch...",
    rematchButton: "Rematch",
    mainMenuButton: "Zurück zum Hauptmenü",
    cpuNoMoves: "CPU hat keine Züge mehr.",
    playerNoMoves: (player) =>
      `${player}, du kannst keine Züge mehr machen! Warte auf CPU...`,
    cpuWins: (pScore, cScore) =>
      `Computer gewinnt mit ${cScore} zu ${pScore} Punkten!`,
    playerWinsCpu: (player, pScore, cScore) =>
      `${player} gewinnt mit ${pScore} zu ${cScore} Punkten!`,
    drawCpu: (pScore, cScore) =>
      `Unentschieden! ${pScore} zu ${cScore} Punkten.`,
    connectionLost:
      "Verbindung zum Server verloren! Versuche erneut zu verbinden...",
    connectionLostReturn: "Verbindung verloren. Zurück zum Hauptmenü.",
    settingsNotImplemented: "Einstellungen sind noch nicht implementiert.",
  },
  en: {
    mainMenuTitle: "Shape Smasher!",
    playerNameLabel: "Player Name:",
    playVsCpuButton: "Play vs Computer",
    playVsPlayerButton: "Player vs Player",
    settingsButton: "Settings",
    settingsTitle: "Settings",
    languageLabel: "Language:",
    langGerman: "German",
    langEnglish: "English",
    langFrench: "French",
    graphicsQualityLabel: "Graphics Quality:",
    graphicsLow: "Low",
    graphicsMedium: "Medium",
    graphicsHigh: "High",
    saveSettingsButton: "Save & Back",
    backToMainMenuButton: "Back to Main Menu",
    waitingForConnection: "Waiting for connection...",
    yourBoard: "Your Board",
    opponentBoard: "Opponent Board",
    scoreLabel: "Score",
    welcomeMessage: "Welcome! Choose a mode.",
    searchingPlayer: "Searching for player...",
    gameStarted: (player, opp) => `${player} vs ${opp}!`,
    playerVsCPU: (player) => `${player} vs Computer!`,
    opponentFinishedMsg: (oppName, oppScore, time) =>
      `${oppName} finished with ${oppScore} pts • Time left: <span id=\"timer\">${time}</span>`,
    gameWin: (oppName, pScore, oScore) =>
      `You won against ${oppName} – Final score ${pScore}:${oScore}`,
    gameLose: (oppName, pScore, oScore) =>
      `You lost against ${oppName} – Final score ${pScore}:${oScore}`,
    opponentLeftMsg: (oppName) => `${oppName} left the game.`,
    rematchRequestedMsg: (oppName) =>
      `${oppName} wants a rematch! Click Rematch to start.`,
    waitingForRematchConfirmMsg: "Waiting for opponent to confirm rematch...",
    rematchButton: "Rematch",
    mainMenuButton: "Back to Main Menu",
    cpuNoMoves: "CPU has no more moves.",
    playerNoMoves: (player) =>
      `${player}, you have no more moves! Waiting for CPU...`,
    cpuWins: (pScore, cScore) =>
      `Computer wins with ${cScore} to ${pScore} points!`,
    playerWinsCpu: (player, pScore, cScore) =>
      `${player} wins with ${pScore} to ${cScore} points!`,
    drawCpu: (pScore, cScore) => `Draw! ${pScore} to ${cScore} points.`,
    connectionLost: "Connection to server lost! Attempting to reconnect...",
    connectionLostReturn: "Connection lost. Returning to main menu.",
    settingsNotImplemented: "Settings are not yet implemented.",
  },
  fr: {
    mainMenuTitle: "Shape Smasher!",
    playerNameLabel: "Nom du joueur:",
    playVsCpuButton: "Jouer contre l'ordinateur",
    playVsPlayerButton: "Joueur contre joueur",
    settingsButton: "Paramètres",
    settingsTitle: "Paramètres",
    languageLabel: "Langue:",
    langGerman: "Allemand",
    langEnglish: "Anglais",
    langFrench: "Français",
    graphicsQualityLabel: "Qualité graphique:",
    graphicsLow: "Bassee",
    graphicsMedium: "Moyenne",
    graphicsHigh: "Haute",
    saveSettingsButton: "Sauvegarder & Retour",
    backToMainMenuButton: "Retour au menu principal",
    waitingForConnection: "En attente de connexion...",
    yourBoard: "Plateau",
    opponentBoard: "Adversaire Plateu",
    scoreLabel: "Score",
    welcomeMessage: "Bienvenue! Choisissez un mode.",
    searchingPlayer: "Recherche d'un joueur...",
    gameStarted: (player, opp) => `${player} contre ${opp} !`,
    playerVsCPU: (player) => `${player} contre l'ordinateur !`,
    opponentFinishedMsg: (oppName, oppScore, time) =>
      `${oppName} a terminé avec ${oppScore} pts • Temps restant: <span id="timer">${time}</span>`,
    gameWin: (oppName, pScore, oScore) =>
      `Vous avez gagné contre ${oppName} – Score final ${pScore}:${oScore}`,
    gameLose: (oppName, pScore, oScore) =>
      `Vous avez perdu contre ${oppName} – Score final ${pScore}:${oScore}`,
    opponentLeftMsg: (oppName) => `${oppName} a quitté la partie.`,
    rematchRequestedMsg: (oppName) =>
      `${oppName} veut une revanche ! Cliquez sur Revanche pour commencer.`,
    waitingForRematchConfirmMsg:
      "En attente de la confirmation de l'adversaire pour la revanche...",
    rematchButton: "Revanche",
    mainMenuButton: "Retour au menu principal",
    cpuNoMoves: "L'IA n'a plus de mouvements.",
    playerNoMoves: (player) =>
      `${player}, vous n'avez plus de mouvements ! En attente de l'IA...`,
    cpuWins: (pScore, cScore) =>
      `L'ordinateur gagne avec ${cScore} contre ${pScore} points !`,
    playerWinsCpu: (player, pScore, cScore) =>
      `${player} gagne avec ${pScore} contre ${cScore} points !`,
    drawCpu: (pScore, cScore) => `Égalité ! ${pScore} contre ${cScore} points.`,
    connectionLost: "Connexion au serveur perdue ! Tentative de reconnexion...",
    connectionLostReturn: "Connexion perdue. Retour au menu principal.",
    settingsNotImplemented: "Les paramètres ne sont pas encore implémentés.",
  },
};

/* ---------- Hilfsfunktionen ------------------------------------------ */
export const getRandomRainbowColor = () => {
  // New palette based on CSS custom properties for a cohesive look
  const palette = [
    "var(--color-primary)",
    "var(--color-primary-light)",
    "var(--color-secondary)",
    "var(--color-accent)",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
};
