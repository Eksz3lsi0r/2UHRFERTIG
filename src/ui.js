/* --------------------------------------------------------------------
 *  src/ui.js   –   Menü- & UI-Handling
 * ------------------------------------------------------------------ */
import { LANG } from "./constants.js";
import { state } from "./state.js";

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
  if (savedLang && LANG[savedLang]) currentLanguage = savedLang;
  if (savedGraphics) graphicsQuality = savedGraphics;

  applyGraphicsQuality();
}

function saveSettings() {
  localStorage.setItem("gameLanguage", currentLanguage);
  localStorage.setItem("gameGraphics", graphicsQuality);
}

/* --------------------------------------------------------------------
 *  Grafikqualität
 * ------------------------------------------------------------------ */
function applyGraphicsQuality() {
  document.body.classList.remove(
    "graphics-low",
    "graphics-medium",
    "graphics-high"
  );
  document.body.classList.add(`graphics-${graphicsQuality}`);
}

/* --------------------------------------------------------------------
 *  Übersetzung
 * ------------------------------------------------------------------ */
function translateUI() {
  document.querySelectorAll("[data-lang-key]").forEach((el) => {
    const key = el.getAttribute("data-lang-key");
    if (LANG[state.currentLanguage] && LANG[state.currentLanguage][key]) {
      el.textContent = LANG[state.currentLanguage][key];
    }
  });
  // refresh headings with current player and opponent names
  updateBoardTitles();
}

/* --------------------------------------------------------------------
 *  Menü-Anzeigen
 * ------------------------------------------------------------------ */
function showMainMenu() {
  const { mainMenu, settings, gameArea } = state.el;
  mainMenu.style.display = "flex";
  settings.style.display = "none";
  gameArea.style.display = "none";
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
}

function showSettingsMenu() {
  const { mainMenu, settings, gameArea } = state.el;
  mainMenu.style.display = "none";
  settings.style.display = "flex";
  gameArea.style.display = "none";
}

function showGameArea() {
  const { mainMenu, settings, gameArea, message } = state.el;
  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "flex";
  // Do NOT hide message overlay here, so timer/info is visible
  // update the board headings
  updateBoardTitles();
  import("./audio.js").then((mod) => mod.startBg());
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
    gameArea: $("gameArea"),

    /* Eingaben & Buttons */
    playerNameInput: $("playerNameInput"),
    playVsCpuButton: $("playVsCpuButton"),
    playVsPlayerButton: $("playVsPlayerButton"),
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
  state.el.saveSettingsButton.addEventListener("click", () => {
    saveSettings();
    showMainMenu();
  });
  state.el.backToMainMenuButton.addEventListener("click", showMainMenu);
  state.el.languageSelect.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    translateUI();
    updateBoardTitles();
  });
  state.el.graphicsQualitySelect.addEventListener("change", (e) => {
    graphicsQuality = e.target.value;
    applyGraphicsQuality();
  });

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
 *  Public API
 * ------------------------------------------------------------------ */
export const ui = {
  /* Methoden */
  initUI,
  translateUI,
  showMainMenu,
  showSettingsMenu,
  showGameArea,
  displayMessage,
  showCatchupTimer,
  updateCatchupTimer,
  hideCatchupTimer,
  showGameResultOverlay,

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
