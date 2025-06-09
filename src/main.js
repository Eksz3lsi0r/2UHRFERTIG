/* --------------------------------------------------------------------
 *  src/main.js   –   Bootstrap & High-Level-Flows
 * ------------------------------------------------------------------ */
import * as audio from "./audio.js";
import { cpu } from "./cpu.js";
import { GridSnap } from "./drag.js";
import { cancelMatchmaking, findGame, socket as networkSocket } from "./network.js";
import { player } from "./player.js";
import { state } from "./state.js";
import { ui } from "./ui.js";

// Import power-up system
import { initializePowerUps, powerUpRegistry } from "./powerups/index.js";

// Initialize power-ups
initializePowerUps();

// Globale Referenzen für Zugriff aus anderen Modulen
// Expose core APIs for global use
window.state = state;
window.player = player;
window.ui = ui;
window.cpu = cpu;
window.audio = audio; // Expose audio system globally
window.powerUpRegistry = powerUpRegistry; // Expose power-up registry globally
window.startCpuMode = startCpuMode;
window.startCpuGameWithDifficulty = startCpuGameWithDifficulty;
window.startPvpMode = startPvpMode;
window.showPvpModeSelection = showPvpModeSelection;
window.showLeaderboard = () => ui.showLeaderboard();

/* --------------------------------------------------------------------
 *  DomContentLoaded  –  alles bereitstellen
 * ------------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  // Show start menu on initial load
  document.getElementById("startMenuContainer").style.display = "flex";

  // Hide main menu and others until user makes a choice
  document.getElementById("mainMenuContainer").style.display = "none";
  document.getElementById("registerMenuContainer").style.display = "none";
  document.getElementById("cpuDifficultyContainer").style.display = "none";
  document.getElementById("pvpModeContainer").style.display = "none";
  document.getElementById("settingsMenuContainer").style.display = "none";
  document.getElementById("leaderboardContainer").style.display = "none";

  // Start menu button handlers
  document.getElementById("loginButton").addEventListener("click", async () => {
    await handleLogin();
  });
  document.getElementById("registerButton").addEventListener("click", () => {
    document.getElementById("startMenuContainer").style.display = "none";
    document.getElementById("registerMenuContainer").style.display = "flex";
  });
  document.getElementById("guestButton").addEventListener("click", () => {
    handleGuestLogin();
  });

  // Registration menu button handlers
  document
    .getElementById("registerConfirmButton")
    .addEventListener("click", async () => {
      await handleRegistration();
    });
  document.getElementById("backToStartButton").addEventListener("click", () => {
    document.getElementById("registerMenuContainer").style.display = "none";
    document.getElementById("startMenuContainer").style.display = "flex";
  });

  // Authentication helper functions
  async function handleLogin() {
    const username = document.getElementById("startNameInput").value.trim();
    const password = document.getElementById("startPasswordInput").value;

    if (!username || !password) {
      alert("Bitte Name und Passwort eingeben!");
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        state.isAuthenticated = true;
        state.isGuest = false;
        state.playerName = username;
        state.accountData = data.account;

        networkSocket.connect();
        document.getElementById("startMenuContainer").style.display = "none";
        document.getElementById("mainMenuContainer").style.display = "flex";
        ui.updateMainMenuForUser();
      } else {
        alert("Login fehlgeschlagen: " + data.error);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Verbindungsfehler beim Login!");
    }
  }

  async function handleRegistration() {
    const username = document.getElementById("registerNameInput").value.trim();
    const password = document.getElementById("registerPasswordInput").value;

    if (!username || !password) {
      alert("Bitte Name und Passwort eingeben!");
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        state.isAuthenticated = true;
        state.isGuest = false;
        state.playerName = username;
        state.accountData = data.account;

        networkSocket.connect();
        document.getElementById("registerMenuContainer").style.display = "none";
        document.getElementById("mainMenuContainer").style.display = "flex";
        ui.updateMainMenuForUser();
      } else {
        alert("Registrierung fehlgeschlagen: " + data.error);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Verbindungsfehler bei der Registrierung!");
    }
  }

  function handleGuestLogin() {
    state.isAuthenticated = false;
    state.isGuest = true;
    state.playerName = "Gast";
    state.accountData = null;

    networkSocket.connect();
    document.getElementById("startMenuContainer").style.display = "none";
    document.getElementById("mainMenuContainer").style.display = "flex";
    ui.updateMainMenuForUser();
  }

  /* UI & Board erzeugen */
  ui.initUI();

  /* GridSnap erst NACH dem Board erstellen */
  GridSnap.init(state.el.board, state.boardCells);

  /* Desktop-Drag-Drop (für Maus) ------------------------------------- */
  state.el.board.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Verhindere Scrollen/Wackeln auf dem gesamten Dokument während Drag
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Begrenze explizit die Größe auf 100vw/100vh
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";
    document.documentElement.style.width = "100vw";
    document.documentElement.style.height = "100vh";
    if (state.currentDragShape) {
      const pos = getHoverPosition(e);
      renderPreview(state.currentDragShape, pos.row, pos.col);
    }
  });
  state.el.board.addEventListener("dragleave", (e) => {
    clearPreview();
    // Stelle Overflow und Größe zurück, wenn Drag vorbei
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.width = "";
    document.body.style.height = "";
    document.documentElement.style.width = "";
    document.documentElement.style.height = "";
  });
  state.el.board.addEventListener("drop", (e) => {
    onDropDesktop(e);
    clearPreview();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.width = "";
    document.body.style.height = "";
    document.documentElement.style.width = "";
    document.documentElement.style.height = "";
  });

  /* Menü-Buttons ------------------------------------------------------ */
  state.el.playVsCpuButton.addEventListener("click", startCpuMode);
  state.el.playVsPlayerButton.addEventListener("click", showPvpModeSelection);
  state.el.settingsButton.addEventListener("click", ui.showSettingsMenu);

  /* Fenstergröße → GridSnap neu initialisieren ----------------------- */
  window.addEventListener("resize", () =>
    GridSnap.init(state.el.board, state.boardCells)
  );

  // Entferne manuelle Touch-Preview-Handler, sie stören GridSnap
  // state.el.board.addEventListener("touchmove", touchMoveHandler, { passive: false });
  // state.el.board.addEventListener("touchend", touchEndHandler);

  // Touch-Drag & Drop erfolgt jetzt ausschließlich über GridSnap

  // PvP Mode Selection Event Handlers
  if (state.el.normalPvPButton) {
    state.el.normalPvPButton.addEventListener("click", () =>
      startPvpMode(false)
    );
  }
  if (state.el.rankedPvPButton) {
    state.el.rankedPvPButton.addEventListener("click", () => {
      if (state.isGuest) {
        alert(
          "Um Ranglistenspiele spielen zu können, müssen Sie sich als Champion registrieren!"
        );
        return;
      }
      startPvpMode(true);
    });
  }
  if (state.el.backFromPvPModeButton) {
    state.el.backFromPvPModeButton.addEventListener("click", ui.showMainMenu);
  }

  // Cancel matchmaking button
  const cancelMatchmakingButton = document.getElementById("cancelMatchmaking");
  if (cancelMatchmakingButton) {
    cancelMatchmakingButton.addEventListener("click", () => {
      cancelMatchmaking();
      showPvpModeSelection();
    });
  }
});

/* --------------------------------------------------------------------
 *  Desktop-Drop-Handler (Maus)
 * ------------------------------------------------------------------ */
function onDropDesktop(ev) {
  ev.preventDefault();
  if (!state.gameActive || !state.currentDragShape) return;

  const rect = state.el.board.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(state.el.board).gap || 0);
  const cell = state.boardCells[0][0].getBoundingClientRect().width;
  const unit = cell + gap;

  const row = Math.floor(
    (ev.clientY - rect.top - state.currentDragOffset.y) / unit
  );
  const col = Math.floor(
    (ev.clientX - rect.left - state.currentDragOffset.x) / unit
  );

  player.handleDrop(state.currentDragShape, row, col);
  state.currentDragShape = null;
}

/* --------------------------------------------------------------------
 *  Schwierigkeitsauswahl anzeigen
 * ------------------------------------------------------------------ */
function startCpuMode() {
  ui.showCpuDifficultyMenu();
}

/* --------------------------------------------------------------------
 *  Einzelspieler (CPU) mit gewählter Schwierigkeit starten
 * ------------------------------------------------------------------ */
function startCpuGameWithDifficulty(difficulty) {
  // Schwierigkeit setzen
  cpu.setDifficulty(difficulty);

  state.currentMode = "cpu";
  // Use name from start menu or fallback
  state.playerName = state.playerName || "Player";
  state.opponentName = "CPU";

  // Spieler-Board und Inventar komplett leeren (auch für Rematch)
  state.playerBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.playerPieces = [];
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
  if (state.el.pieces) state.el.pieces.innerHTML = "";

  // Board DOM komplett neu aufbauen
  if (typeof window.ui?.buildBoardDOM === "function") {
    window.ui.buildBoardDOM();
  }
  ui.showGameArea();

  /* Spiel zurücksetzen */
  player.resetGame();
  // Nach Reset GridSnap neu initialisieren (wichtig für Touch)
  if (state.el.board && state.boardCells?.length) {
    GridSnap.init(state.el.board, state.boardCells);
  }
  cpu.initGame();
  cpu.takeTurn(); // CPU legt los
}

/* --------------------------------------------------------------------
 *  PvP Modus Auswahl anzeigen
 * ------------------------------------------------------------------ */
function showPvpModeSelection() {
  // Allow both guests and authenticated users to access PvP menu
  // Guests can play normal games, but ranked games are restricted
  ui.showPvpModeMenu();
}

/* --------------------------------------------------------------------
 *  Mehrspieler (PvP) starten
 * ------------------------------------------------------------------ */
function startPvpMode(ranked = false) {
  // Double-check authentication for ranked games
  if (ranked && state.isGuest) {
    alert("Gäste können nicht an Ranglisten-Spielen teilnehmen!");
    return;
  }

  state.currentMode = "player";
  // Use name from start menu or fallback
  state.playerName = state.playerName || "Player";
  state.rankedPvP = ranked;

  // Board DOM komplett neu aufbauen und State leeren
  state.playerBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.playerPieces = [];
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
  if (state.el.pieces) state.el.pieces.innerHTML = "";

  if (typeof window.ui?.buildBoardDOM === "function") {
    window.ui.buildBoardDOM();
  }

  // Show matchmaking overlay instead of game area immediately
  ui.showMatchmakingOverlay(ranked);

  player.resetGame();
  // Nach Reset GridSnap neu initialisieren (wichtig für Touch)
  if (state.el.board && state.boardCells?.length) {
    GridSnap.init(state.el.board, state.boardCells);
  }
  findGame(state.playerName); // ruft Server
}

/* --------------------------------------------------------------------
 *  Board-Sync an Server (wird von player.handleDrop aufgerufen)
 * ------------------------------------------------------------------ */
export function boardChanged() {
  if (state.currentMode === "player") {
    try {
      import("./network.js").then((mod) => {
        // Use debounced functions to prevent excessive network calls during power-up animations
        if (typeof mod.debouncedBoardUpdate === "function") {
          mod.debouncedBoardUpdate();
        } else if (typeof mod.sendBoard === "function") {
          mod.sendBoard(); // Fallback
        }

        if (typeof mod.debouncedScoreUpdate === "function") {
          mod.debouncedScoreUpdate();
        } else if (typeof mod.sendScore === "function") {
          mod.sendScore(); // Fallback
        }
      });
    } catch (err) {
      console.error("Error synchronizing board and score:", err);
    }
  }
}

// Preview-Funktionen: Hover-Vorschau auf Board-Zellen
function clearPreview() {
  for (const row of state.boardCells) {
    for (const cell of row) {
      cell.classList.remove(
        "preview-valid-cell",
        "preview-invalid-cell",
        "row-flash"
      );
    }
  }
}

function renderPreview(shape, baseR, baseC) {
  clearPreview();
  // Simuliere Board
  const temp = state.playerBoard.map((r) => [...r]);
  // Platziere Form im Temp-Board
  for (const [r, c] of shape) {
    const rr = baseR + r,
      cc = baseC + c;
    if (rr < 0 || rr >= 10 || cc < 0 || cc >= 10) continue;
    temp[rr][cc] = 1;
    const cell = state.boardCells[rr][cc];
    const valid = player.canPlace(shape, baseR, baseC);
    cell.classList.add(valid ? "preview-valid-cell" : "preview-invalid-cell");
  }
  // Zeilen/Spalten prüfen, die nach Platzierung voll wären
  // Nur Reihen, hier nur Zeilen
  for (let r = 0; r < 10; r++) {
    if (temp[r].every((v) => v === 1)) {
      for (let c = 0; c < 10; c++) {
        state.boardCells[r][c].classList.add("row-flash");
      }
    }
  }
}

function getHoverPosition(e) {
  const rect = state.el.board.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(state.el.board).gap || 0);
  const cellSize = state.boardCells[0][0].getBoundingClientRect().width;
  const unit = cellSize + gap;
  let x, y;
  if (e.touches) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else {
    x = e.clientX;
    y = e.clientY;
  }
  // Offset berücksichtigen, damit Vorschau exakt wie Drop ist
  const offset = state.currentDragOffset || { x: 0, y: 0 };
  const row = Math.floor((y - rect.top - offset.y) / unit);
  const col = Math.floor((x - rect.left - offset.x) / unit);
  return { row, col };
}
