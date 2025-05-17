/* --------------------------------------------------------------------
 *  src/main.js   –   Bootstrap & High-Level-Flows
 * ------------------------------------------------------------------ */
import { state } from "./state.js";
import { ui } from "./ui.js";
import { player } from "./player.js";
import { cpu } from "./cpu.js";
import { GridSnap } from "./drag.js";
import { findGame } from "./network.js";
import { LANG } from "./constants.js";
import { socket as networkSocket } from "./network.js";

// Globale Referenzen für Zugriff aus anderen Modulen
// Expose core APIs for global use
window.state = state;
window.player = player;
window.ui = ui;
window.cpu = cpu;

/* --------------------------------------------------------------------
 *  DomContentLoaded  –  alles bereitstellen
 * ------------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  // sofort mit dem Server verbinden → Matchmaking funktioniert wieder
  if (state.currentMode !== "cpu") {
    networkSocket.connect();
  }

  /* UI & Board erzeugen */
  ui.initUI();

  /* GridSnap erst NACH dem Board erstellen */
  GridSnap.init(state.el.board, state.boardCells);

  /* Desktop-Drag-Drop (für Maus) ------------------------------------- */
  state.el.board.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation(); // Verhindert weitere Event-Bubbling
    // Verhindere Scrollen/Wackeln auf dem gesamten Dokument während Drag
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (state.currentDragShape) {
      const pos = getHoverPosition(e);
      renderPreview(state.currentDragShape, pos.row, pos.col);
    }
  });
  state.el.board.addEventListener("dragleave", (e) => {
    clearPreview();
    // Stelle Overflow zurück, wenn Drag vorbei
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });
  state.el.board.addEventListener("drop", (e) => {
    onDropDesktop(e);
    clearPreview();
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  /* Menü-Buttons ------------------------------------------------------ */
  state.el.playVsCpuButton.addEventListener("click", startCpuMode);
  state.el.playVsPlayerButton.addEventListener("click", startPvpMode);
  state.el.settingsButton.addEventListener("click", ui.showSettingsMenu);

  /* Fenstergröße → GridSnap neu initialisieren ----------------------- */
  window.addEventListener("resize", () =>
    GridSnap.init(state.el.board, state.boardCells)
  );

  // Entferne manuelle Touch-Preview-Handler, sie stören GridSnap
  // state.el.board.addEventListener("touchmove", touchMoveHandler, { passive: false });
  // state.el.board.addEventListener("touchend", touchEndHandler);

  // Touch-Drag & Drop erfolgt jetzt ausschließlich über GridSnap
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
 *  Einzelspieler (CPU) starten
 * ------------------------------------------------------------------ */
function startCpuMode() {
  state.currentMode = "cpu";
  state.playerName = state.el.playerNameInput.value || "Player";
  state.opponentName = "CPU";
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
 *  Mehrspieler (PvP) starten
 * ------------------------------------------------------------------ */
function startPvpMode() {
  state.currentMode = "player";
  state.playerName = state.el.playerNameInput.value || "Player";
  ui.showGameArea();

  player.resetGame();
  // Nach Reset GridSnap neu initialisieren (wichtig für Touch)
  if (state.el.board && state.boardCells?.length) {
    GridSnap.init(state.el.board, state.boardCells);
  }
  findGame(state.playerName); // ruft Server
  // Show searching message
  ui.displayMessage(LANG[state.currentLanguage].searchingPlayer, "info");
}

/* --------------------------------------------------------------------
 *  Board-Sync an Server (wird von player.handleDrop aufgerufen)
 * ------------------------------------------------------------------ */
export function boardChanged() {
  if (state.currentMode === "player") {
    try {
      import("./network.js").then((mod) => {
        if (typeof mod.sendBoard === "function") {
          mod.sendBoard();
        }
        if (typeof mod.sendScore === "function" && state.playerScore > 0) {
          mod.sendScore();
        }
      });
    } catch (err) {
      console.error("Fehler beim synchronisieren des Boards:", err);
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
