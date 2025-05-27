/* --------------------------------------------------------------------
 *  src/ui.js   –   Menü- & UI-Handling
 * ------------------------------------------------------------------ */
import { LANG } from "./constants.js";
import { state } from "./state.js";

/* --------------------------------------------------------------------
 *  Chat Message Function (available globally early)
 * ------------------------------------------------------------------ */
// --- Make appendChatMessage globally available early ---
window.appendChatMessage = function (msg, fromSelf = false) {
  const chatMessages = document.getElementById("chat-messages");
  console.log("[Chat] appendChatMessage called", {
    msg,
    fromSelf,
    chatMessagesExists: !!chatMessages,
  });

  if (!chatMessages) {
    console.warn("[Chat] chat-messages div not found!");
    return;
  }

  try {
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.margin = "2px 0";
    div.style.wordBreak = "break-word";
    div.style.textAlign = fromSelf ? "right" : "left";
    div.style.color = fromSelf ? "#a96cff" : "#fff";

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    console.log("[Chat] Message successfully appended to chat");
  } catch (error) {
    console.error("[Chat] Error appending message:", error);
  }
};

/* --------------------------------------------------------------------
 *  Modul-Variablen
 * ------------------------------------------------------------------ */
let currentLanguage = "de";
let graphicsQuality = "medium";

/* --------------------------------------------------------------------
 *  Settings  (localStorage)
 * ------------------------------------------------------------------ */
function loadSettings() {
  const savedLang = localStorage.getItem("gameLanguage");
  const savedGraphics = localStorage.getItem("gameGraphics");
  console.log("Loading settings from localStorage:", {
    savedLang,
    savedGraphics,
  });

  if (savedLang && LANG[savedLang]) currentLanguage = savedLang;
  if (savedGraphics) graphicsQuality = savedGraphics;

  console.log("Settings loaded:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });
  applyGraphicsQuality();
}

function saveSettings() {
  console.log("Saving settings:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });
  localStorage.setItem("gameLanguage", currentLanguage);
  localStorage.setItem("gameGraphics", graphicsQuality);
  console.log("Settings saved to localStorage");
}

/* --------------------------------------------------------------------
 *  Grafikqualität
 * ------------------------------------------------------------------ */
function applyGraphicsQuality() {
  console.log("Applying graphics quality:", graphicsQuality);
  document.body.classList.remove(
    "graphics-low",
    "graphics-medium",
    "graphics-high"
  );
  document.body.classList.add(`graphics-${graphicsQuality}`);
  console.log("Body class list:", document.body.className);
}

/* --------------------------------------------------------------------
 *  Übersetzung
 * ------------------------------------------------------------------ */
function translateUI() {
  // Synchronize state.currentLanguage with local currentLanguage
  state.currentLanguage = currentLanguage;

  document.querySelectorAll("[data-lang-key]").forEach((el) => {
    const key = el.getAttribute("data-lang-key");
    if (LANG[currentLanguage] && LANG[currentLanguage][key]) {
      el.textContent = LANG[currentLanguage][key];
    }
  });
  // refresh headings with current player and opponent names
  updateBoardTitles();
}

function getLangText(key) {
  return (LANG[currentLanguage] && LANG[currentLanguage][key]) || key;
}

/* --------------------------------------------------------------------
 *  Menü-Anzeigen
 * ------------------------------------------------------------------ */
function showMainMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  // ensure start menu is hidden
  const startMenu = document.getElementById("startMenuContainer");
  const registerMenu = document.getElementById("registerMenuContainer");
  if (startMenu) startMenu.style.display = "none";
  if (registerMenu) registerMenu.style.display = "none";
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  // Update UI based on authentication status
  updateMainMenuForUser();

  mainMenu.style.display = "flex";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  import("./audio.js").then((mod) => mod.stopBg());

  // Spieler-Board und Inventar komplett leeren
  if (state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.boardCells[r][c].className = "cell";
        state.boardCells[r][c].innerHTML = "";
      }
    }
  }
  if (state.el.score) state.el.score.textContent = "0";
  if (state.el.pieces) state.el.pieces.innerHTML = "";
  // Auch Opponent-Board leeren (optional, für Klarheit)
  if (state.opponentBoardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.opponentBoardCells[r][c].className = "opponent-cell";
      }
    }
  }
  if (state.el.oppScore) state.el.oppScore.textContent = "0";

  // Spieler-Board und Inventar auch im State leeren
  state.playerBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.playerPieces = [];

  // DOM-Grid mit leerem State synchronisieren
  if (state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.boardCells[r][c].className = "cell";
        state.boardCells[r][c].innerHTML = "";
        state.boardCells[r][c].style.background = "";
        state.boardCells[r][c].classList.remove(
          "filled",
          "rainbow",
          "preview-valid-cell",
          "preview-invalid-cell",
          "row-flash"
        );
      }
    }
  }

  // Update player ranking points display
  updatePlayerRankingPoints();
}

function showSettingsMenu() {
  console.log("Showing settings menu with current values:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });

  const { mainMenu, settings, gameArea, leaderboard } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "flex";
  settings.style.flexDirection = "column";
  settings.style.alignItems = "center";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }

  // Update select elements to show current values
  if (state.el.languageSelect) {
    state.el.languageSelect.value = currentLanguage;
    console.log("Set language select to:", currentLanguage);
  }
  if (state.el.graphicsQualitySelect) {
    state.el.graphicsQualitySelect.value = graphicsQuality;
    console.log("Set graphics quality select to:", graphicsQuality);
  }

  // Translate UI to reflect current language
  translateUI();

  // Apply current graphics quality
  applyGraphicsQuality();
}

function showGameArea() {
  const { mainMenu, settings, gameArea, message, leaderboard, pvpMode } =
    state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "flex";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  // Do NOT hide message overlay here, so timer/info is visible
  // update the board headings
  updateBoardTitles();
  import("./audio.js").then((mod) => mod.startBg());
}

function showCpuDifficultyMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "flex";
  }

  // Translate UI to reflect current language
  translateUI();
}

function showPvpModeMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  if (pvpMode) {
    pvpMode.style.display = "flex";
    pvpMode.style.flexDirection = "column";
    pvpMode.style.alignItems = "center";
  }

  // Update PvP menu based on user status
  updatePvpMenuForUser();

  // Translate UI to reflect current language
  translateUI();
}

function showLeaderboard() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  if (leaderboard) {
    leaderboard.style.display = "flex";
    leaderboard.style.flexDirection = "column";
    leaderboard.style.alignItems = "center";
  }
  if (pvpMode) pvpMode.style.display = "none";

  // Load leaderboard data
  loadLeaderboardData();
}

async function loadLeaderboardData() {
  const loadingElement = document.getElementById("leaderboardLoading");
  const emptyElement = document.getElementById("leaderboardEmpty");
  const listElement = document.getElementById("leaderboardList");

  // Show loading state
  if (loadingElement) loadingElement.style.display = "block";
  if (emptyElement) emptyElement.style.display = "none";
  if (listElement) listElement.style.display = "none";

  try {
    const response = await fetch("/api/leaderboard");
    const leaderboardData = await response.json();

    // Hide loading state
    if (loadingElement) loadingElement.style.display = "none";

    if (
      leaderboardData.success &&
      leaderboardData.players &&
      leaderboardData.players.length > 0
    ) {
      // Show leaderboard list
      if (listElement) {
        listElement.style.display = "block";
        renderLeaderboard(leaderboardData.players);
      }
      if (emptyElement) emptyElement.style.display = "none";
    } else {
      // Show empty state
      if (emptyElement) emptyElement.style.display = "block";
      if (listElement) listElement.style.display = "none";
    }
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    // Hide loading state and show empty state on error
    if (loadingElement) loadingElement.style.display = "none";
    if (emptyElement) emptyElement.style.display = "block";
    if (listElement) listElement.style.display = "none";
  }
}

function renderLeaderboard(players) {
  const listElement = document.getElementById("leaderboardList");
  if (!listElement) return;

  // Sort players by ranking points (highest first)
  const sortedPlayers = players.sort(
    (a, b) => b.rankingPoints - a.rankingPoints
  );

  // Generate HTML for leaderboard items
  const leaderboardHTML = sortedPlayers
    .map((player, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : "";

      return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">#${rank}</div>
        <div class="leaderboard-player-info">
          <div class="leaderboard-player-name">${escapeHtml(player.name)}</div>
          <div class="leaderboard-player-stats">
            <span data-lang-key="wins">${getLangText("wins")}</span>: ${
        player.wins || 0
      } • 
            <span data-lang-key="losses">${getLangText("losses")}</span>: ${
        player.losses || 0
      }
          </div>
        </div>
        <div class="leaderboard-points">
          ${player.rankingPoints}
          <div class="leaderboard-points-label" data-lang-key="rankingPoints">${getLangText(
            "rankingPoints"
          )}</div>
        </div>
      </div>
    `;
    })
    .join("");

  listElement.innerHTML = leaderboardHTML;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* --------------------------------------------------------------------
 *  Spielfeld-DOM anlegen
 * ------------------------------------------------------------------ */
function buildBoardDOM() {
  const { board, oppBoard } = state.el;

  // Überprüfen, ob die DOM-Elemente existieren
  if (!board || !oppBoard) {
    console.error("Board-Elemente nicht gefunden. UI wird neu initialisiert.");
    setTimeout(initUI, 100);
    return;
  }

  board.innerHTML = "";
  oppBoard.innerHTML = "";
  state.boardCells = [];
  state.opponentBoardCells = [];

  // Setze Grid-Properties für moderne Layout-Gestaltung
  board.style.display = "grid";
  board.style.gridTemplateColumns = "repeat(10, 1fr)";
  board.style.gridTemplateRows = "repeat(10, 1fr)";
  board.style.gap = "3px";

  oppBoard.style.display = "grid";
  oppBoard.style.gridTemplateColumns = "repeat(10, 1fr)";
  oppBoard.style.gridTemplateRows = "repeat(10, 1fr)";
  oppBoard.style.gap = "3px";

  for (let r = 0; r < 10; r++) {
    const row = [];
    const oppRow = [];
    for (let c = 0; c < 10; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      board.appendChild(cell);
      row.push(cell);

      const oppCell = document.createElement("div");
      oppCell.className = "opponent-cell";
      oppCell.dataset.row = r;
      oppCell.dataset.col = c;
      oppBoard.appendChild(oppCell);
      oppRow.push(oppCell);
    }
    state.boardCells.push(row);
    state.opponentBoardCells.push(oppRow);
  }
}

/* --------------------------------------------------------------------
 *  Initialisierung
 * ------------------------------------------------------------------ */
function initUI() {
  const $ = (id) => document.getElementById(id);

  /* DOM-Referenzen cachen */
  state.el = {
    /* Menüs & Container */
    mainMenu: $("mainMenuContainer"),
    settings: $("settingsMenuContainer"),
    leaderboard: $("leaderboardContainer"),
    pvpMode: $("pvpModeContainer"),
    gameArea: $("gameArea"),

    /* Eingaben & Buttons */
    playerNameInput: $("playerNameInput"),
    playVsCpuButton: $("playVsCpuButton"),
    playVsPlayerButton: $("playVsPlayerButton"),
    normalPvPButton: $("normalPvPButton"),
    rankedPvPButton: $("rankedPvPButton"),
    backFromPvPModeButton: $("backFromPvPModeButton"),
    leaderboardButton: $("leaderboardButton"),
    settingsButton: $("settingsButton"),
    saveSettingsButton: $("saveSettingsButton"),
    backToMainMenuButton: $("backToMainMenuButton"),
    languageSelect: $("languageSelect"),
    graphicsQualitySelect: $("graphicsQualitySelect"),

    /* Spiel-Bereiche */
    message: $("message"),
    board: $("board"),
    pieces: $("pieces"),
    oppBoard: $("opponentBoard"),
    score: $("score"),
    oppScore: $("opponentScore"),
  };

  /* Button-Events */
  if (state.el.saveSettingsButton) {
    state.el.saveSettingsButton.addEventListener("click", () => {
      console.log("Save settings button clicked");
      saveSettings();
      showMainMenu();
    });
  } else {
    console.error("saveSettingsButton not found");
  }

  if (state.el.backToMainMenuButton) {
    state.el.backToMainMenuButton.addEventListener("click", showMainMenu);
  } else {
    console.error("backToMainMenuButton not found");
  }

  if (state.el.languageSelect) {
    state.el.languageSelect.addEventListener("change", (e) => {
      console.log("Language changed to:", e.target.value);
      currentLanguage = e.target.value;
      translateUI();
      updateBoardTitles();
    });
  } else {
    console.error("languageSelect not found");
  }

  if (state.el.graphicsQualitySelect) {
    state.el.graphicsQualitySelect.addEventListener("change", (e) => {
      console.log("Graphics quality changed to:", e.target.value);
      graphicsQuality = e.target.value;
      applyGraphicsQuality();
    });
  } else {
    console.error("graphicsQualitySelect not found");
  }

  // CPU Difficulty Selection Button Event Handlers
  const easyModeButton = document.getElementById("easyModeButton");
  const mediumModeButton = document.getElementById("mediumModeButton");
  const hardModeButton = document.getElementById("hardModeButton");
  const backFromDifficultyButton = document.getElementById(
    "backFromDifficultyButton"
  );

  if (easyModeButton) {
    easyModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("easy");
      }
    });
  }

  if (mediumModeButton) {
    mediumModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("medium");
      }
    });
  }

  if (hardModeButton) {
    hardModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("hard");
      }
    });
  }

  if (backFromDifficultyButton) {
    backFromDifficultyButton.addEventListener("click", showMainMenu);
  }

  // Leaderboard button event handler
  if (state.el.leaderboardButton) {
    state.el.leaderboardButton.addEventListener("click", showLeaderboard);
  }

  // Back from leaderboard button event handler
  const backFromLeaderboardButton = document.getElementById(
    "backFromLeaderboardButton"
  );
  if (backFromLeaderboardButton) {
    backFromLeaderboardButton.addEventListener("click", showMainMenu);
  }

  /* Initiale Abläufe */
  loadSettings(); // Werte aus localStorage
  translateUI(); // Texte einsetzen
  buildBoardDOM(); // Raster erzeugen einmalig

  // GridSnap nach jedem Board-Build initialisieren (wichtig für Touch-Drag)
  import("./drag.js").then(({ GridSnap }) => {
    if (state.el.board && state.boardCells?.length) {
      GridSnap.init(state.el.board, state.boardCells);
    }
  });
}

/* --------------------------------------------------------------------
 *  Nachrichtenanzeige
 * ------------------------------------------------------------------ */
function displayMessage(text, type = "info") {
  if (!state.el.message) return;

  // Use innerHTML to allow HTML (e.g. <span id="timer">)
  state.el.message.innerHTML = text;

  // Remove all possible classes
  state.el.message.classList.remove("win", "lose", "info");

  // Add type class
  if (type) {
    state.el.message.classList.add(type);
  }

  // Ensure visibility
  state.el.message.style.display = "block";

  // Animation
  state.el.message.classList.remove("message-animated");
  void state.el.message.offsetWidth;
  state.el.message.classList.add("message-animated");
}

// add function to refresh board titles with player/opponent names
function updateBoardTitles() {
  // display only player and opponent names in headings
  const playerLabel = state.playerName;
  const oppLabel = state.opponentName;
  const yourEl = document.querySelector(
    '#playerArea [data-lang-key="yourBoard"]'
  );
  const oppEl = document.querySelector(
    '#opponentArea [data-lang-key="opponentBoard"]'
  );
  if (yourEl) yourEl.textContent = playerLabel;
  if (oppEl) oppEl.textContent = oppLabel;
}

/* --------------------------------------------------------------------
 *  Timer-Anzeige für Aufholjagd
 * ------------------------------------------------------------------ */
function showCatchupTimer({ playerName, score, isFirstFinisher, secondsLeft }) {
  const catchupTimer = document.getElementById("catchup-timer");
  if (!catchupTimer) return;

  // Prüfe, ob auf Mobile (max-width: 600px)
  if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) {
    catchupTimer.classList.add("mobile-countdown");
  } else {
    catchupTimer.classList.remove("mobile-countdown");
  }

  let infoText;
  if (isFirstFinisher) {
    infoText = `${playerName} hat das Spiel mit ${score} Punkten beendet.<br>Warte auf den Gegner, der noch <span id='catchup-timer-value'></span> Minuten Zeit hat.`;
  } else {
    infoText = `${playerName} hat das Spiel mit ${score} Punkten beendet.<br>Du hast noch <span id='catchup-timer-value'></span> Minuten, um mehr Punkte zu erreichen!`;
  }

  catchupTimer.innerHTML = infoText;
  catchupTimer.style.display = "block";

  // Set initial time for both players
  if (typeof secondsLeft === "number") {
    const timerVal = document.getElementById("catchup-timer-value");
    if (timerVal) {
      const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
      const s = String(secondsLeft % 60).padStart(2, "0");
      timerVal.textContent = `${m}:${s}`;
    }
  }
}

function updateCatchupTimer(secondsLeft) {
  const timerVal = document.getElementById("catchup-timer-value");
  if (timerVal) {
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    timerVal.textContent = `${m}:${s}`;
  }
}

function hideCatchupTimer() {
  const catchupTimer = document.getElementById("catchup-timer");
  if (catchupTimer) catchupTimer.style.display = "none";
}

/* --------------------------------------------------------------------
 *  Game Result Overlay
 * ------------------------------------------------------------------ */
function showGameResultOverlay({ win, msg }) {
  const overlay = document.getElementById("gameResultOverlay");
  const title = document.getElementById("gameResultTitle");
  const msgBox = document.getElementById("gameResultMsg");
  const rematchBtn = document.getElementById("rematchButton");
  const mainMenuBtn = document.getElementById("mainMenuButton");

  if (!overlay || !title || !msgBox || !rematchBtn || !mainMenuBtn) return;

  // Set title and color
  if (win) {
    title.textContent = "Gewonnen";
    title.style.color = "#1fd655";
  } else {
    title.textContent = "Verloren";
    title.style.color = "#e74c3c";
  }
  msgBox.innerHTML = msg || "";
  overlay.style.display = "flex";

  // Rematch click
  rematchBtn.onclick = () => {
    overlay.style.display = "none";
    // Rematch = wie die jeweiligen Hauptmenü-Buttons
    if (
      state.currentMode === "player" &&
      typeof window.startPvpMode === "function"
    ) {
      window.startPvpMode();
    } else if (
      state.currentMode === "cpu" &&
      typeof window.startCpuMode === "function"
    ) {
      window.startCpuMode();
    } else {
      // Fallback: wie bisher
      if (state.currentMode === "player") {
        state.currentMode = "player";
        if (state.countdownInterval) clearInterval(state.countdownInterval);
        state.gameActive = false;
        state.opponentFinished = false;
        state.opponentFinalScore = 0;
        state.timeLeft = 0;
        if (typeof window.player?.resetGame === "function") {
          window.player.resetGame();
        }
        state.opponentBoardCells = [];
        if (state.el.oppBoard) state.el.oppBoard.innerHTML = "";
        if (typeof window.ui?.buildBoardDOM === "function") {
          window.ui.buildBoardDOM();
        } else if (typeof buildBoardDOM === "function") {
          buildBoardDOM();
        }
        if (state.el.oppScore) state.el.oppScore.textContent = "0";
        if (state.el.score) state.el.score.textContent = "0";
      } else if (state.currentMode === "cpu") {
        state.cpuBoard = Array(10)
          .fill(0)
          .map(() => Array(10).fill(0));
        if (state.opponentBoardCells?.length) {
          for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
              state.opponentBoardCells[r][c].className = "opponent-cell";
            }
          }
        }
        if (state.el.oppScore) state.el.oppScore.textContent = "0";
      }
      if (typeof window.requestRematch === "function") {
        window.requestRematch();
      } else if (window.socket && window.socket.emit) {
        window.socket.emit("requestRematch");
      }
    }
  };
  // Main menu click
  mainMenuBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.goToMainMenu === "function") {
      window.goToMainMenu();
    } else if (window.ui && window.ui.showMainMenu) {
      window.ui.showMainMenu();
    }
  };
}

/* --------------------------------------------------------------------
 *  Ranked Game Summary Overlay
 * ------------------------------------------------------------------ */
function showRankedGameSummaryOverlay({
  win,
  yourScore,
  opponentScore,
  opponentName,
  rankingChange,
  timeRemaining,
}) {
  const overlay = document.getElementById("rankedGameSummaryOverlay");
  const title = document.getElementById("rankedGameResultTitle");
  const yourFinalScore = document.getElementById("rankedYourFinalScore");
  const opponentFinalScore = document.getElementById(
    "rankedOpponentFinalScore"
  );
  const previousPoints = document.getElementById("rankedPreviousPoints");
  const pointsChange = document.getElementById("rankedPointsChange");
  const newPoints = document.getElementById("rankedNewPoints");
  const timeRemainingSection = document.getElementById("timeRemainingSection");
  const timeRemainingSpan = document.getElementById("rankedTimeRemaining");
  const rematchBtn = document.getElementById("rankedRematchButton");
  const mainMenuBtn = document.getElementById("rankedMainMenuButton");

  if (
    !overlay ||
    !title ||
    !yourFinalScore ||
    !opponentFinalScore ||
    !rematchBtn ||
    !mainMenuBtn
  )
    return;

  // Set title and scores
  const lang = LANG[state.currentLanguage];
  if (win) {
    title.textContent = lang.rankedGameWin(opponentName);
    title.style.color = "#1fd655";
  } else {
    title.textContent = lang.rankedGameLose(opponentName);
    title.style.color = "#e74c3c";
  }

  // Set final scores
  yourFinalScore.textContent = yourScore || 0;
  opponentFinalScore.textContent = opponentScore || 0;

  // Set ranking points change if available
  if (rankingChange && previousPoints && pointsChange && newPoints) {
    previousPoints.textContent = rankingChange.oldPoints || 0;
    newPoints.textContent = rankingChange.newPoints || 0;

    const change = rankingChange.change || 0;
    if (change > 0) {
      pointsChange.textContent = lang.rankedPointsGained(change);
      pointsChange.style.color = "#1fd655";
    } else {
      pointsChange.textContent = lang.rankedPointsLost(change);
      pointsChange.style.color = "#e74c3c";
    }
  }

  // Set time remaining if applicable
  if (timeRemaining > 0 && timeRemainingSection && timeRemainingSpan) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timeRemainingSpan.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
    timeRemainingSection.style.display = "block";
  } else if (timeRemainingSection) {
    timeRemainingSection.style.display = "none";
  }

  // Show overlay
  overlay.style.display = "flex";

  // Set up button handlers
  rematchBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.requestRematch === "function") {
      window.requestRematch();
    } else if (window.socket && window.socket.emit) {
      window.socket.emit("requestRematch");
    }
  };

  mainMenuBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.goToMainMenu === "function") {
      window.goToMainMenu();
    } else if (window.ui && window.ui.showMainMenu) {
      window.ui.showMainMenu();
    }
  };

  // Update player ranking points display for main menu
  updatePlayerRankingPoints();
}

// --- Chat UI Logic (PvP only) ---
function setupChatUI() {
  const chatBubble = document.getElementById("chat-bubble");
  const chatModal = document.getElementById("chat-modal");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const chatMessages = document.getElementById("chat-messages");

  if (
    !chatBubble ||
    !chatModal ||
    !chatClose ||
    !chatForm ||
    !chatInput ||
    !chatSend ||
    !chatMessages
  )
    return;

  // Show/hide chat bubble only in PvP mode
  function updateChatVisibility() {
    if (state.currentMode === "player") {
      chatBubble.style.display = "block";
    } else {
      chatBubble.style.display = "none";
      chatModal.style.display = "none";
    }
  }

  // Open chat modal
  function openChat() {
    chatModal.style.display = "flex";
    chatModal.classList.add("open");
    chatInput.focus();
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Close chat modal
  function closeChat() {
    chatModal.style.display = "none";
    chatModal.classList.remove("open");
    chatInput.blur();
  }

  // Check if device is mobile
  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 600px)").matches;
  }

  // Close chat when clicking outside (mobile only)
  function handleClickOutside(e) {
    if (isMobile() && chatModal.style.display === "flex") {
      // Check if click is outside of chat modal
      if (!chatModal.contains(e.target) && !chatBubble.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        closeChat();
      }
    }
  }

  // Desktop: open chat on TAB
  document.addEventListener("keydown", (e) => {
    if (
      state.currentMode === "player" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      if (e.key === "Tab") {
        e.preventDefault();
        if (chatModal.style.display === "flex") {
          closeChat();
        } else {
          openChat();
        }
      }
    }
  });

  // Add click outside listener for mobile
  document.addEventListener("touchstart", handleClickOutside, {
    capture: true,
  });
  document.addEventListener("click", handleClickOutside, { capture: true });

  // Open chat on bubble click/tap
  chatBubble.onclick = openChat;
  // Mobile: also allow touch
  chatBubble.ontouchstart = (e) => {
    e.preventDefault();
    openChat();
  };
  // Close chat
  chatClose.onclick = closeChat;

  // Send message (desktop: Enter, mobile: button)
  chatForm.onsubmit = (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg.length > 0) {
      window.sendChatMessage?.(msg);
      chatInput.value = "";
    }
  };

  // Update chat visibility on mode change
  const origShowGameArea = ui.showGameArea;
  ui.showGameArea = function () {
    origShowGameArea.call(ui);
    updateChatVisibility();
  };
  // Also update on main menu/settings
  const origShowMainMenu = ui.showMainMenu;
  ui.showMainMenu = function () {
    origShowMainMenu.call(ui);
    updateChatVisibility();
  };
  const origShowSettingsMenu = ui.showSettingsMenu;
  ui.showSettingsMenu = function () {
    origShowSettingsMenu.call(ui);
    updateChatVisibility();
  };
  // Initial
  updateChatVisibility();
}

/* --------------------------------------------------------------------
 *  Public API
 * ------------------------------------------------------------------ */
export const ui = {
  /* Methoden */
  initUI,
  translateUI,
  showMainMenu,
  showSettingsMenu,
  showPvpModeMenu,
  showGameArea,
  showCpuDifficultyMenu,
  showLeaderboard,
  buildBoardDOM,
  displayMessage,
  getLangText,
  updateBoardTitles,
  updateMainMenuForUser,
  updatePvpMenuForUser,
  showCatchupTimer,
  updateCatchupTimer,
  hideCatchupTimer,
  showGameResultOverlay,
  showRankedGameSummaryOverlay,

  /* Reactive Getter/Setter */
  get lang() {
    return currentLanguage;
  },
  set lang(l) {
    currentLanguage = l;
    translateUI();
  },
  get graphics() {
    return graphicsQuality;
  },
  set graphics(g) {
    graphicsQuality = g;
    applyGraphicsQuality();
  },
};

/* --------------------------------------------------------------------
 *  Update Player Ranking Points Display
 * ------------------------------------------------------------------ */
function updateMainMenuForUser() {
  // Update leaderboard button behavior for guests
  if (state.el.leaderboardButton) {
    if (state.isGuest) {
      // For guests, show a different message or disable ranked features
      const rankingPoints =
        state.el.leaderboardButton.querySelector(".ranking-points");
      if (rankingPoints) {
        rankingPoints.style.display = "none";
      }
    } else {
      // For authenticated users, show their ranking
      const rankingPoints =
        state.el.leaderboardButton.querySelector(".ranking-points");
      if (rankingPoints) {
        rankingPoints.style.display = "flex";
      }
      updatePlayerRankingPoints();
    }
  }

  // Note: Guests CAN access PvP mode (normal games), so no restrictions here
  // The restriction is only for ranked games, handled in updatePvpMenuForUser
}

function updatePvpMenuForUser() {
  const rankedButton = document.getElementById("rankedPvPButton");
  const normalButton = document.getElementById("normalPvPButton");
  const guestWarning = document.getElementById("guestRankedWarning");

  if (state.isGuest) {
    // For guests: normal PvP is available, ranked is restricted
    if (normalButton) {
      normalButton.disabled = false;
      normalButton.style.opacity = "1";
      normalButton.style.cursor = "pointer";
      normalButton.title =
        "Entspanntes Spiel ohne Auswirkung auf die Rangliste";
    }

    if (rankedButton) {
      rankedButton.disabled = true;
      rankedButton.style.opacity = "0.5";
      rankedButton.style.cursor = "not-allowed";
      rankedButton.title = "Nur für registrierte Champions verfügbar";
      // Add visual strikethrough effect
      rankedButton.style.textDecoration = "line-through";
      rankedButton.style.position = "relative";
    }

    if (guestWarning) {
      guestWarning.style.display = "block";
    }
  } else {
    // For authenticated users: both modes available
    if (normalButton) {
      normalButton.disabled = false;
      normalButton.style.opacity = "1";
      normalButton.style.cursor = "pointer";
      normalButton.title =
        "Entspanntes Spiel ohne Auswirkung auf die Rangliste";
    }

    if (rankedButton) {
      rankedButton.disabled = false;
      rankedButton.style.opacity = "1";
      rankedButton.style.cursor = "pointer";
      rankedButton.style.textDecoration = "none";
      rankedButton.title =
        "Kämpfe um Ranglistenpunkte und steige in der Rangliste auf";
    }

    if (guestWarning) {
      guestWarning.style.display = "none";
    }
  }
}

async function updatePlayerRankingPoints() {
  try {
    // Use playerName from state (set in start menu)
    const playerName = state.playerName || "Player";
    const response = await fetch(
      `/api/player-ranking/${encodeURIComponent(playerName)}`
    );
    const data = await response.json();

    const rankingPointsElement = document.getElementById("playerRankingPoints");
    if (rankingPointsElement) {
      rankingPointsElement.textContent = data.rankingPoints || 1000;
    }
  } catch (error) {
    console.log("Could not fetch player ranking:", error);
    // Default to 1000 if fetch fails
    const rankingPointsElement = document.getElementById("playerRankingPoints");
    if (rankingPointsElement) {
      rankingPointsElement.textContent = "1000";
    }
  }
}

// Call setupChatUI after ui is defined
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupChatUI);
} else {
  setupChatUI();
}
