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
  if (message && state.currentMode === "cpu") {
    message.style.display = "none";
  }
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

  state.el.message.textContent = text;

  // Alle möglichen Klassen entfernen
  state.el.message.classList.remove("win", "lose", "info");

  // Typ-Klasse hinzufügen
  if (type) {
    state.el.message.classList.add(type);
  }

  // Sichtbarkeit sicherstellen
  state.el.message.style.display = "block";

  // Animation hinzufügen, falls notwendig
  state.el.message.classList.remove("message-animated");
  void state.el.message.offsetWidth;
  state.el.message.classList.add("message-animated");
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
