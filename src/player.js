/* --------------------------------------------------------------------
 *  src/player.js   –   Logik für das Spieler-Brett
 * ------------------------------------------------------------------ */
import {
  ALL_POSSIBLE_SHAPES,
  getRandomRainbowColor,
  LANG
} from "./constants.js";
import { GridSnap } from "./drag.js";
import { state } from "./state.js";
import { ui } from "./ui.js"; // für displayMessage

// Import power-up system

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    debugLog(...args);
  }
}

/* --------------------------------------------------------------------
 *  Öffentliche API
 * ------------------------------------------------------------------ */
export const player = {
  resetGame,
  generatePieces,
  renderPieces,
  canPlace,
  placeShape,
  hasMoves,
  checkGameOverCondition,
  finishGame,
  handleDrop, // <-- handleDrop hinzugefügt
  clearLines, // <-- clearLines für Power-Ups hinzugefügt
  hasFullLines, // <-- hasFullLines für Power-Ups hinzugefügt
  updateScoreDisplay,
  updatePermanentMultiplierDisplay,
  updateCurrentMultiplierDisplay, // <-- new function to update current multiplier display
  regenerateInventoryAfterPowerUp, // <-- new robust inventory regeneration
};

/* --------------------------------------------------------------------
 *  Reset – neues Spieler-Brett anlegen
 * ------------------------------------------------------------------ */
function resetGame() {
  state.playerScore = 0;
  state.gameActive = true;
  state.playerPieces = [];
  state.playerBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.currentDragShape = null;
  state.currentDragOffset = { x: 0, y: 0 };

  // Reset multiplier systems
  state.consecutiveClears = 0;
  state.currentMultiplier = 1;
  state.permanentMultiplier = 1;

  // DOM zurücksetzen
  state.el.score.textContent = "0";
  if (state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = state.boardCells[r][c];

        // Reset className to base "cell" class
        cell.className = "cell";

        // Clear all potential animation and styling classes
        cell.classList.remove(
          "filled", "rainbow", "preview-valid-cell", "preview-invalid-cell",
          "row-flash", "multi-line-flash", "fill-warning", "fill-danger",
          "clearing", "flash", "preview-valid", "preview-invalid",
          "highlight-score", "score-combo"
        );

        // Clear any inline styles that might have been applied during animations
        cell.style.background = "";
        cell.style.backgroundColor = "";
        cell.style.border = "";
        cell.style.boxShadow = "";
        cell.style.transform = "";
        cell.style.filter = "";
        cell.style.opacity = "";
        cell.style.animation = "";

        // Board-Cell-Inhalt immer leeren (z.B. falls per innerHTML o.ä. befüllt)
        cell.innerHTML = "";
      }
    }
  }

  // Clear board-level animation classes that might persist from previous games
  const boardElement = state.el.board;
  if (boardElement) {
    boardElement.classList.remove("multi-line-flash");
    // Clear any inline styles that might have been applied
    boardElement.style.transform = "";
    boardElement.style.filter = "";
    boardElement.style.animation = "";
  }

  // State-Board auch im DOM spiegeln (Sicherheit)
  if (state.playerBoard?.length && state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.playerBoard[r][c] === 0) {
          state.boardCells[r][c].className = "cell";
        }
      }
    }
  }

  generatePieces();
  renderPieces();

  // Reset permanent multiplier display
  updatePermanentMultiplierDisplay();
  updateCurrentMultiplierDisplay();

  // Nach jedem Reset GridSnap neu initialisieren (wichtig für Touch)
  import("./drag.js").then(({ GridSnap }) => {
    if (state.el.board && state.boardCells?.length) {
      GridSnap.init(state.el.board, state.boardCells);
    }
  });
}

/* --------------------------------------------------------------------
 *  Teile-Inventar erzeugen (3 zufällige, passende Shapes)
 * ------------------------------------------------------------------ */
/* --------------------------------------------------------------------
 *  Teile-Inventar erzeugen – SCHWERE Version
 *  – liefert nur Tripel, die garantiert in irgendeiner Reihenfolge
 *    auf das aktuelle Spieler-Brett passen (inkl. Zwischenclearing)
 * ------------------------------------------------------------------ */
function generatePieces() {
  // Prevent inventory generation during power-up animations
  if (state.stormAnimationActive || state.extendAnimationActive || state.electroAnimationActive) {
    debugLog("Power-up animation active, skipping piece generation");
    return;
  }

  // 0) Kopie des IST-Boards anlegen
  const boardSnapshot = state.playerBoard.map((row) => [...row]);

  /* ---------- interne Helfer ---------- */
  const canPlace = (shape, brd, br, bc) => {
    for (const [r, c] of shape) {
      const rr = br + r,
        cc = bc + c;
      if (rr < 0 || rr >= 10 || cc < 0 || cc >= 10) return false;
      if (brd[rr][cc] !== 0) return false;
    }
    return true;
  };

  const placeAndClear = (shape, brd, br, bc) => {
    const nb = brd.map((r) => [...r]); // tiefe Kopie
    shape.forEach(([r, c]) => (nb[br + r][bc + c] = 1));

    // Reihen / Spalten identifizieren
    const fullRows = [],
      fullCols = [];
    for (let r = 0; r < 10; r++)
      if (nb[r].every((v) => v === 1)) fullRows.push(r);
    for (let c = 0; c < 10; c++)
      if (nb.every((row) => row[c] === 1)) fullCols.push(c);

    // Leer räumen
    fullRows.forEach((r) => nb[r].fill(0));
    fullCols.forEach((c) => {
      for (let r = 0; r < 10; r++) nb[r][c] = 0;
    });
    return nb;
  };

  const oneFitsSomewhere = (trip, brd) =>
    trip.some((sh) => {
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 10; c++) if (canPlace(sh, brd, r, c)) return true;
      return false;
    });

  const tripletFits = (trip, brd) => {
    const perms = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const dfs = (order, idx, b) => {
      if (idx === 3) return true;
      const sh = trip[order[idx]];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (canPlace(sh, b, r, c)) {
            if (dfs(order, idx + 1, placeAndClear(sh, b, r, c))) return true;
          }
        }
      }
      return false;
    };
    return perms.some((p) => dfs(p, 0, brd));
  };

  /* ---------- Hauptschleife ---------- */
  const tested = new Set(); // Tripel-Duplikate vermeiden
  const MAX_ATTEMPTS = 5000; // Sicherheitsgrenze
  let validSet = null,
    tries = 0;

  while (!validSet && tries++ < MAX_ATTEMPTS) {
    // Drei Zufallsindices – Wiederholungen erlaubt
    const a = Math.floor(Math.random() * ALL_POSSIBLE_SHAPES.length);
    const b = Math.floor(Math.random() * ALL_POSSIBLE_SHAPES.length);
    const c = Math.floor(Math.random() * ALL_POSSIBLE_SHAPES.length);
    const trip = [
      ALL_POSSIBLE_SHAPES[a],
      ALL_POSSIBLE_SHAPES[b],
      ALL_POSSIBLE_SHAPES[c],
    ];

    // Duplikat-Key (unabhängig von Reihenfolge)
    const key = [a, b, c].sort((x, y) => x - y).join("-");
    if (tested.has(key)) continue;
    tested.add(key);

    // Frühfilter: mindestens ein Shape muss *jetzt* irgendwo passen
    if (!oneFitsSomewhere(trip, boardSnapshot)) continue;

    // Vollständige Permutation-Prüfung
    if (tripletFits(trip, boardSnapshot)) validSet = trip;
  }

  // Fallback (extrem selten)
  if (!validSet) {
    const one = ALL_POSSIBLE_SHAPES[0];
    validSet = [one, one, one];
  }

  /* ---------- Rückgabe im alten Format ---------- */
  state.playerPieces = validSet.map((sh) => ({
    shape: sh.map((c) => [...c]), // tiefe Kopie
    color: getRandomRainbowColor(),
  }));

  // Apply modular power-up generation system
  if (window.powerUpRegistry) {
    state.playerPieces = window.powerUpRegistry.applyPowerUpGeneration(state.playerPieces);
  }
}

/* --------------------------------------------------------------------
 *  Teile rendern & Drag-Events binden
 * ------------------------------------------------------------------ */
function renderPieces() {
  const piecesDiv = state.el.pieces;
  if (!piecesDiv) return;

  piecesDiv.innerHTML = "";
  piecesDiv.classList.remove("pieces-animated");
  void piecesDiv.offsetWidth;
  piecesDiv.classList.add("pieces-animated");

  const cellPx = parseFloat(
    getComputedStyle(state.el.board).getPropertyValue("--js-block-size") || 30
  );

  state.playerPieces.forEach((pieceObj, idx) => {
    const shape = pieceObj.shape || pieceObj; // Fallback falls noch altes Format
    const color = pieceObj.color || getRandomRainbowColor();

    // Bestimme die Dimensionen des Shapes für das Grid-Layout
    let maxR = 0,
      maxC = 0;
    shape.forEach(([r, c]) => {
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    });

    const pieceDiv = document.createElement("div");
    pieceDiv.className = "piece"; // Default class, will be updated by power-up system
    pieceDiv.setAttribute("draggable", true);

    // Grid-Layout für das Piece konfigurieren
    pieceDiv.style.display = "grid";
    pieceDiv.style.gridTemplateRows = `repeat(${maxR + 1}, ${cellPx}px)`;
    pieceDiv.style.gridTemplateColumns = `repeat(${maxC + 1}, ${cellPx}px)`;
    pieceDiv.style.gap = "2px";
    pieceDiv.style.padding = "4px";

    // Desktop Drag
    pieceDiv.addEventListener("dragstart", (e) => {
      try {
        import("./audio.js").then((mod) => mod.pickSound?.play());
      } catch (e) {}
      state.currentDragShape = shape;
      state.currentDragOffset = { x: e.offsetX, y: e.offsetY };
    });

    // Touch Drag (Fix: touch-action explizit setzen und Event korrekt binden)
    pieceDiv.style.touchAction = "none";
    pieceDiv.addEventListener(
      "touchstart",
      GridSnap.getTouchStartHandler(shape),
      { passive: false }
    );

    // Render blocks mit Grid und Farbe
    shape.forEach(([r, c]) => {
      const block = document.createElement("div");
      block.className = "block rainbow"; // Default classes
      block.style.gridRowStart = r + 1;
      block.style.gridColumnStart = c + 1;
      block.style.background = color;
      block.style.transition = "transform 0.15s, box-shadow 0.15s";

      // Apply modular power-up styling if this is a power-up
      let isPowerUp = false;
      if (window.powerUpRegistry) {
        isPowerUp = window.powerUpRegistry.applyPowerUpStyling(pieceObj, pieceDiv, block, cellPx);
      }

      // If not a power-up, keep default styling
      if (!isPowerUp) {
        block.classList.add("rainbow");
      }

      pieceDiv.appendChild(block);
    });

    piecesDiv.appendChild(pieceDiv);
  });
}

/* --------------------------------------------------------------------
 *  Prüf- & Place-Funktionen
 * ------------------------------------------------------------------ */
function canPlace(shape, br, bc) {
  const shapeArr = shape?.shape || shape;
  for (const [r, c] of shapeArr) {
    const rr = br + r;
    const cc = bc + c;
    if (rr < 0 || rr >= 10 || cc < 0 || cc >= 10) return false;
    if (state.playerBoard[rr][cc] !== 0) return false;
  }
  return true;
}

function placeShape(shape, br, bc) {
  // Finde das Piece-Objekt, um die Farbe zu bekommen
  let pieceObj = state.playerPieces.find(
    (p) =>
      (p.shape || p) === shape ||
      (Array.isArray(p.shape) &&
        JSON.stringify(p.shape) === JSON.stringify(shape))
  );

  // Use modular power-up system to check and execute power-ups
  if (window.powerUpRegistry && window.powerUpRegistry.executePowerUp(pieceObj, br, bc, state)) {
    // Power-up executed - inventory has been cleared by powerUpRegistry
    return; // Exit early for power-up pieces
  }

  const color =
    pieceObj?.color || require("./constants.js").getRandomRainbowColor();
  // Update UI cells for placed shape
  shape.forEach(([r, c]) => {
    const cellEl = state.boardCells[br + r]?.[bc + c];
    if (cellEl) {
      cellEl.classList.add("filled");
      cellEl.style.background = color;
      cellEl.classList.add("rainbow");
    }
  });
  for (const [r, c] of shape) {
    state.playerBoard[br + r][bc + c] = 1;
  }

  // Apply permanent multiplier to shape placement points
  const shapePoints = shape.length * state.permanentMultiplier;
  state.playerScore += shapePoints;
  updateScoreDisplay();

  // Merke den Zustand vor dem Löschen für Combo-Logic
  const hadLinesBeforeClearing = _hasFullLines();
  _clearLines();

  // Falls keine Linien gelöscht wurden, Combo zurücksetzen
  if (!hadLinesBeforeClearing) {
    state.consecutiveClears = 0;
    state.currentMultiplier = 1;
    updateCurrentMultiplierDisplay();
  }

  // Entferne das platzte Piece aus dem Inventar
  const idx = state.playerPieces.findIndex(
    (sh) =>
      (sh.shape || sh) === shape ||
      (Array.isArray(sh.shape) &&
        JSON.stringify(sh.shape) === JSON.stringify(shape))
  );
  if (idx !== -1) state.playerPieces.splice(idx, 1);

  // Board-Sync für PvP - sende Board-Update nach jeder Platzierung
  if (state.currentMode === "player") {
    import("./network.js").then((mod) => {
      // Use debounced functions to prevent spam during power-up animations
      if (typeof mod.debouncedBoardUpdate === "function") {
        mod.debouncedBoardUpdate();
      } else if (typeof mod.sendBoard === "function") {
        mod.sendBoard();
      }

      if (typeof mod.debouncedScoreUpdate === "function") {
        mod.debouncedScoreUpdate();
      } else if (typeof mod.sendScore === "function") {
        mod.sendScore();
      }
    });
  }
}

/* --------------------------------------------------------------------
 *  Hilfsfunktion: Prüft ob es volle Linien gibt
 * ------------------------------------------------------------------ */
function _hasFullLines() {
  // Prüfe Reihen
  for (let r = 0; r < 10; r++) {
    if (state.playerBoard[r].every((v) => v === 1)) return true;
  }
  // Prüfe Spalten
  for (let c = 0; c < 10; c++) {
    let colFull = true;
    for (let r = 0; r < 10; r++) {
      if (state.playerBoard[r][c] !== 1) colFull = false;
    }
    if (colFull) return true;
  }
  return false;
}





/* --------------------------------------------------------------------
 *  Zeilen/Spalten räumen - mit erweitertem Punktesystem und Multiplikatoren
 * ------------------------------------------------------------------ */
function _clearLines() {
  const fullRows = [],
    fullCols = [];
  for (let r = 0; r < 10; r++) {
    if (state.playerBoard[r].every((v) => v === 1)) fullRows.push(r);
  }
  for (let c = 0; c < 10; c++) {
    let colFull = true;
    for (let r = 0; r < 10; r++) {
      if (state.playerBoard[r][c] !== 1) colFull = false;
    }
    if (colFull) fullCols.push(c);
  }

  if (fullRows.length === 0 && fullCols.length === 0) {
    // Keine Linien gelöscht - kein Reset hier, wird in placeShape gehandhabt
    return;
  }

  // Animation & Sound
  import("./audio.js").then((mod) => mod.clearSound.play?.());

  // Multi-Line Flash Animation für mehrfache Löschungen
  if (
    fullRows.length > 1 ||
    fullCols.length > 1 ||
    (fullRows.length && fullCols.length)
  ) {
    const boardElement = document.getElementById("board");
    if (boardElement) {
      boardElement.classList.add("multi-line-flash");
      setTimeout(() => {
        boardElement.classList.remove("multi-line-flash");
      }, 1200);
    }
  }

  fullRows.forEach((r) => {
    state.playerBoard[r].fill(0);
    // Update UI: remove filled, rainbow and inline background
    for (let c = 0; c < 10; c++) {
      const cell = state.boardCells[r][c];
      if (cell) {
        cell.classList.remove("filled", "rainbow");
        cell.style.background = "";
        cell.innerHTML = ""; // Clear any content (e.g., power-up emojis)
      }
    }
  });
  fullCols.forEach((c) => {
    for (let r = 0; r < 10; r++) {
      state.playerBoard[r][c] = 0;
      const cell = state.boardCells[r][c];
      if (cell) {
        cell.classList.remove("filled", "rainbow");
        cell.style.background = "";
        cell.innerHTML = ""; // Clear any content (e.g., power-up emojis)
      }
    }
  });

  // Erweiterte Punkteberechnung
  let basePoints = fullRows.length + fullCols.length;

  // Bonus für gleichzeitige Zeilen- und Spalten-Löschung
  if (fullRows.length && fullCols.length) basePoints += 2;

  // Multi-Line Bonus (mehr als eine Linie gleichzeitig)
  if (fullRows.length > 1) basePoints += fullRows.length * 2;
  if (fullCols.length > 1) basePoints += fullCols.length * 2;

  // Combo-System: Aufeinanderfolgende Löschungen
  state.consecutiveClears++;

  // Permanenter Multiplikator erhöhen bei jeder Linien-Löschung
  const oldPermanentMultiplier = state.permanentMultiplier;
  state.permanentMultiplier += 1; // +1x für jede gelöschte Linie (summativ)
  debugLog(`Permanent multiplier increased from ${oldPermanentMultiplier.toFixed(0)}x to ${state.permanentMultiplier.toFixed(0)}x`);

  // Multiplikator berechnen (steigt mit Combos)
  if (state.consecutiveClears > 1) {
    state.currentMultiplier = Math.min(state.consecutiveClears, 8); // Maximum 8x
  } else {
    state.currentMultiplier = 1;
  }

  // Finale Punkte mit BEIDEN Multiplikatoren (Combo * Permanent)
  let finalPoints = basePoints * 10 * state.currentMultiplier * state.permanentMultiplier;

  // Berechne die Gesamtzahl der gelöschten Linien für die Animation
  const totalLinesCleared = fullRows.length + fullCols.length;

  // Animationen anzeigen
  _showScoreAnimations(finalPoints, state.currentMultiplier, totalLinesCleared);

  state.playerScore += finalPoints;
  updateScoreDisplay();
  updatePermanentMultiplierDisplay();
  updateCurrentMultiplierDisplay();

  // Board-Sync für PvP - sende Board-Update nach Line-Clearing
  if (state.currentMode === "player") {
    import("./network.js").then((mod) => {
      // Use debounced functions to prevent spam during power-up animations
      if (typeof mod.debouncedBoardUpdate === "function") {
        mod.debouncedBoardUpdate();
      } else if (typeof mod.sendBoard === "function") {
        mod.sendBoard();
      }

      if (typeof mod.debouncedScoreUpdate === "function") {
        mod.debouncedScoreUpdate();
      } else if (typeof mod.sendScore === "function") {
        mod.sendScore();
      }
    });
  }
}

/* --------------------------------------------------------------------
 *  Score Animation Functions
 * ------------------------------------------------------------------ */
function _showScoreAnimations(finalPoints, currentMultiplier, totalLinesCleared) {
  debugLog(`Showing score animations: ${finalPoints} points, ${currentMultiplier}x multiplier, ${totalLinesCleared} lines cleared`);

  // Create score animation message
  const messageDiv = document.createElement("div");
  messageDiv.className = "score-animation-message";
  messageDiv.style.cssText = `
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 15px 30px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
    z-index: 1000;
    animation: scoreMessageAppear 0.6s ease-out;
    text-align: center;
  `;

  let messageText = `🎯 ${finalPoints} Punkte!`;
  if (totalLinesCleared > 0) {
    messageText += `\n${totalLinesCleared} Linie${totalLinesCleared > 1 ? 'n' : ''} gelöscht!`;
  }
  if (currentMultiplier > 1) {
    messageText += `\n${currentMultiplier}x Multiplier!`;
  }

  messageDiv.textContent = messageText;
  messageDiv.style.whiteSpace = 'pre-line';

  document.body.appendChild(messageDiv);

  // Add CSS animation keyframes if they don't exist
  if (!document.querySelector('#score-animation-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'score-animation-styles';
    styleSheet.textContent = `
      @keyframes scoreMessageAppear {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8) translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1) translateY(0);
        }
      }
      @keyframes scoreMessageFade {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(-20px); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Remove message after animation
  setTimeout(() => {
    messageDiv.style.animation = 'scoreMessageFade 0.5s ease-in forwards';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 500);
  }, 2000);
}

function _showMultiplierAnimation(multiplier, comboCount) {
  debugLog(`Showing multiplier animation: ${multiplier}x multiplier, ${comboCount} combo`);

  // Create multiplier animation message
  const messageDiv = document.createElement("div");
  messageDiv.className = "multiplier-animation-message";
  messageDiv.style.cssText = `
    position: fixed;
    top: 25%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #FF6B6B, #FF5252);
    color: white;
    padding: 12px 25px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
    z-index: 1001;
    animation: multiplierPulse 0.8s ease-out;
    text-align: center;
  `;

  let messageText = `🔥 ${multiplier}x Multiplier!`;
  if (comboCount > 1) {
    messageText += `\n${comboCount} Combo!`;
  }

  messageDiv.textContent = messageText;
  messageDiv.style.whiteSpace = 'pre-line';

  document.body.appendChild(messageDiv);

  // Add CSS animation keyframes if they don't exist
  if (!document.querySelector('#multiplier-animation-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'multiplier-animation-styles';
    styleSheet.textContent = `
      @keyframes multiplierPulse {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.6);
        }
        50% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.1);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      @keyframes multiplierFade {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Remove message after animation
  setTimeout(() => {
    messageDiv.style.animation = 'multiplierFade 0.6s ease-in forwards';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 600);
  }, 1500);
}

function _showPointsAnimation(points) {
  debugLog(`Showing points animation: +${points} points`);

  // Create points animation message
  const messageDiv = document.createElement("div");
  messageDiv.className = "points-animation-message";
  messageDiv.style.cssText = `
    position: fixed;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #2196F3, #1976D2);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
    z-index: 999;
    animation: pointsFloat 1s ease-out;
    text-align: center;
  `;

  messageDiv.textContent = `+${points} Punkte`;

  document.body.appendChild(messageDiv);

  // Add CSS animation keyframes if they don't exist
  if (!document.querySelector('#points-animation-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'points-animation-styles';
    styleSheet.textContent = `
      @keyframes pointsFloat {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) translateY(20px);
        }
        30% {
          opacity: 1;
          transform: translate(-50%, -50%) translateY(0);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) translateY(-30px);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Remove message after animation
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 1000);
}

/* --------------------------------------------------------------------
 *  Test-Funktion für Animationen (zur Debugging)
 * ------------------------------------------------------------------ */
function testAnimations() {
  debugLog("Testing animations...");
  _showMultiplierAnimation(2, 2);
  setTimeout(() => {
    _showPointsAnimation(50);
  }, 1000);
}

// Test-Funktion global verfügbar machen
window.testAnimations = testAnimations;

// Test function for permanent multiplier
window.testPermanentMultiplier = function() {
  debugLog("Testing permanent multiplier...");
  debugLog("Current permanent multiplier:", state.permanentMultiplier);

  // Simulate line clearing to increase permanent multiplier
  state.permanentMultiplier += 1;
  debugLog("Increased permanent multiplier to:", state.permanentMultiplier);

  // Update display
  updatePermanentMultiplierDisplay();

  // Test CPU permanent multiplier too
  state.cpuPermanentMultiplier += 1;
  debugLog("Increased CPU permanent multiplier to:", state.cpuPermanentMultiplier);

  // Call CPU update function directly
  const cpuMultiplierElement = document.getElementById("opponentPermanentMultiplier");
  const cpuMultiplierValueElement = cpuMultiplierElement?.querySelector(".multiplier-value");

  if (cpuMultiplierElement && cpuMultiplierValueElement) {
    if (state.cpuPermanentMultiplier > 1.0) {
      cpuMultiplierElement.style.display = "flex";
      cpuMultiplierValueElement.textContent = `${state.cpuPermanentMultiplier.toFixed(0)}x`;
    } else {
      cpuMultiplierElement.style.display = "none";
    }
  }
};

// Test function to force storm piece generation (for debugging)
window.forceStormPiece = function() {
  if (state.playerPieces.length > 0) {
    state.playerPieces[0] = {
      shape: [[0, 0]], // STORM_SHAPE
          color: '#4a90e2',
      isStorm: true
    };
    renderPieces();
    debugLog("Storm piece forced in inventory!");
  }
};

// Test function to fill board with some blocks for storm testing
window.fillTestBlocks = function() {
  // Add some test blocks to the board
  const testPositions = [
    [2, 2], [2, 3], [2, 4],
    [4, 1], [4, 2], [4, 3],
    [6, 5], [6, 6], [6, 7],
    [8, 2], [8, 3], [8, 4]
  ];

  testPositions.forEach(([r, c]) => {
    if (r < 10 && c < 10) {
      state.playerBoard[r][c] = 1;
      const cell = state.boardCells[r][c];
      if (cell) {
        cell.classList.add('filled', 'rainbow');
        cell.style.background = '#FF6B6B';
      }
    }
  });

  debugLog("Test blocks added to board!");
};

/* --------------------------------------------------------------------
 *  Punkteanzeige bumpen
 * ------------------------------------------------------------------ */
function updateScoreDisplay() {
  if (state.el.score) state.el.score.textContent = state.playerScore;

  // Send score update with debouncing for real-time synchronization in PvP mode
  if (state.currentMode === "player") {
    try {
      import("./network.js").then((mod) => {
        // Use debounced function to prevent spam during power-up animations
        if (typeof mod.debouncedScoreUpdate === "function") {
          mod.debouncedScoreUpdate();
        } else if (typeof mod.sendScore === "function") {
          mod.sendScore(); // Fallback
        }
      });
    } catch (err) {
      console.error("Error sending score update:", err);
    }
  }
}

/* --------------------------------------------------------------------
 *  Permanent Multiplier Display Update
 * ------------------------------------------------------------------ */
function updatePermanentMultiplierDisplay() {
  debugLog("updatePermanentMultiplierDisplay called, permanentMultiplier:", state.permanentMultiplier);
  const multiplierElement = document.getElementById("playerPermanentMultiplier");
  const multiplierValueElement = multiplierElement?.querySelector(".multiplier-value");

  if (multiplierElement && multiplierValueElement) {
    // Always show the multiplier display from the beginning
    debugLog("Showing permanent multiplier display:", state.permanentMultiplier.toFixed(0) + "x");
    multiplierElement.style.display = "flex";
    // Format as whole number since we increment by 1
    multiplierValueElement.textContent = `${state.permanentMultiplier.toFixed(0)}x`;
  } else {
    debugLog("Could not find permanent multiplier elements");
  }
}

/* --------------------------------------------------------------------
 *  Current Multiplier Display Update
 * ------------------------------------------------------------------ */
function updateCurrentMultiplierDisplay() {
  debugLog("updateCurrentMultiplierDisplay called, currentMultiplier:", state.currentMultiplier);
  const multiplierElement = document.getElementById("playerCurrentMultiplier");
  const multiplierValueElement = multiplierElement?.querySelector(".multiplier-value");

  if (multiplierElement && multiplierValueElement) {
    // Always show the multiplier display from the beginning
    debugLog("Showing current multiplier display:", state.currentMultiplier.toFixed(0) + "x");
    multiplierElement.style.display = "flex";
    // Format as whole number since we increment by 1
    multiplierValueElement.textContent = `${state.currentMultiplier.toFixed(0)}x`;

    // Add pulsing effect when multiplier is > 1
    if (state.currentMultiplier > 1) {
      multiplierElement.style.animation = "fire-pulse 1s ease-in-out";
      setTimeout(() => {
        multiplierElement.style.animation = "fire-pulse 2s infinite ease-in-out";
      }, 1000);
    }
  } else {
    debugLog("Could not find current multiplier elements");
  }
}

/* --------------------------------------------------------------------
 *  Gibt es noch legale Züge?
 * ------------------------------------------------------------------ */
function hasMoves() {
  return state.playerPieces.some((sh) => canPlaceSomewhere(sh));
}
function canPlaceSomewhere(sh) {
  const shapeArr = sh.shape || sh;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (canPlace(shapeArr, r, c)) return true;
    }
  }
  return false;
}

/* --------------------------------------------------------------------
 *  Game-Over-Erkennung (aufrufen nach jedem Zug)
 * ------------------------------------------------------------------ */
function checkGameOverCondition() {
  debugLog("checkGameOverCondition aufgerufen");

  // Skip game over check during power-up animations
  if (state.stormAnimationActive || state.extendAnimationActive || state.electroAnimationActive) {
    debugLog("Power-up animation active, skipping game over check");
    return;
  }

  // CPU-Modus: Spielende wenn beide keine Züge mehr haben oder wenn Spieler CPU nach beendetem KI-Zug überholt
  if (state.currentMode === "cpu") {
    debugLog("CPU-Modus");

    // Wenn keine Pieces mehr, neue Pieces generieren (unabhängig von hasMoves)
    // ABER NICHT während Power-up-Animationen
    if (state.playerPieces.length === 0 && !state.stormAnimationActive && !state.extendAnimationActive && !state.electroAnimationActive) {
      debugLog("Keine Player Pieces mehr, generiere neue");
      generatePieces();
      renderPieces();
    }

    // Nach dem Generieren prüfen, ob jetzt noch Züge möglich sind
    if (!hasMoves()) {
      debugLog("Keine Züge mehr möglich");
      // Neue Game-Over-Bedingung: Spieler hat keine Züge mehr, CPU ist noch aktiv und hat mehr Punkte
      if (state.cpuGameActive && state.cpuScore > state.playerScore) {
        finishGame(
          false,
          LANG[state.currentLanguage]?.cpuWins(
            state.playerScore,
            state.cpuScore
          ) || "Game Over!"
        );
        return;
      }
      // Keine Züge mehr nach Nachschub → Spielende
      if (!state.cpuGameActive) {
        debugLog("CPU nicht aktiv, Spiel beenden");
        const playerWon = state.playerScore >= state.cpuScore;
        finishGame(playerWon);
      }
      return;
    }

    if (!state.cpuGameActive) {
      debugLog("CPU nicht aktiv");
      if (state.playerScore > state.cpuScore) {
        debugLog("Player Score höher als CPU Score, Spiel beenden");
        finishGame(true);
        return;
      }
      if (!hasMoves()) {
        debugLog("Keine Züge mehr möglich, Spiel beenden");
        const playerWon = state.playerScore >= state.cpuScore;
        finishGame(playerWon);
      }
    }
    return;
  }

  // PvP: nur Pieces nachfüllen, keine lokale Spielbeendigung (Server steuert Ende)
  if (state.currentMode === "player") {
    debugLog("PvP-Modus");

    // Skip game over check during storm animation
    if (state.stormAnimationActive) {
      debugLog("Storm animation active in PvP, skipping checks");
      return;
    }

    if (state.playerPieces.length === 0 && !state.stormAnimationActive) {
      debugLog("Keine Player Pieces mehr, generiere neue");
      generatePieces();
      renderPieces();
    }
    if (!hasMoves()) {
      debugLog("Keine Züge mehr möglich, Spielende an Server melden");
      import("./network.js").then((mod) => {
        if (mod.socket && typeof mod.socket.emit === "function") {
          mod.socket.emit("gameOver", state.playerScore);
        }
      });
      state.gameActive = false;
    }
  }
}

/* --------------------------------------------------------------------
 *  Spiel beenden – ruft ui.displayMessage und Game-Over-Buttons
 * ------------------------------------------------------------------ */
function finishGame(playerWon, msgOverride) {
  debugLog("finishGame aufgerufen", { playerWon, msgOverride });
  state.gameActive = false;
  let msg = msgOverride;
  if (!msg) {
    msg = playerWon ? "Du hast gewonnen!" : "Game Over!";
  }
  ui.displayMessage?.(msg, playerWon ? "win" : "lose");
  ui.showGameResultOverlay?.({ win: playerWon, msg });
  // PvP: Server über Spielende informieren
  if (state.currentMode === "player" && state.playerId) {
    import("./network.js").then((mod) => {
      mod.socket.emit("gameOver", state.playerScore);
    });
  }
  // CPU: gameOver erst senden, wenn CPU auch fertig
  if (state.currentMode === "cpu") {
    debugLog("CPU-Modus: warte bis CPU fertig");
    // warte bis cpuGameActive false und player keine Züge mehr
    if (!state.cpuGameActive && !hasMoves()) {
      import("./network.js").then(() => {}); // keine Aktion für CPU offline
    }
  }
}

/* --------------------------------------------------------------------
 *  Hilfsfunktion: Preview & Board-Sync (von GridSnap drop)
 * ------------------------------------------------------------------ */
export function handleDrop(shape, row, col) {
  if (!state.gameActive) return;
  if (!player.canPlace(shape, row, col)) return;

  try {
    player.placeShape(shape, row, col);
    player.renderPieces();

    // Sound abspielen
    import("./audio.js").then((mod) => {
      if (typeof mod.placeSound?.play === "function") {
        mod.placeSound.play();
      }
    });

    player.checkGameOverCondition();

    // Board-Sync für PvP
    if (state.currentMode === "player") {
      import("./network.js").then((mod) => {
        if (typeof mod.sendBoard === "function") {
          mod.sendBoard();
        }
        if (typeof mod.sendScore === "function") {
          mod.sendScore();
        }
      });
    }
  } catch (err) {
    console.error("Fehler beim Platzieren:", err);
  }
}

// Power-Up Visual Indicator Functions
window.showPowerUpIndicator = function(powerUpType, powerUpName) {
  const indicator = document.getElementById('powerUpIndicator');
  if (!indicator) return;

  const icon = indicator.querySelector('.power-up-icon');
  const name = indicator.querySelector('.power-up-name');

  // Clear previous classes
  indicator.className = 'power-up-indicator';

  // Set type-specific styling and content
  switch(powerUpType) {
    case 'storm':
      indicator.classList.add('storm');
      icon.textContent = '🌪️';
      name.textContent = 'STURM';
      break;
    case 'electro':
      indicator.classList.add('electro');
      icon.textContent = '⚡';
      name.textContent = 'ELEKTRO';
      break;
    case 'extend':
      indicator.classList.add('extend');
      icon.textContent = '🔄';
      name.textContent = 'EXTEND';
      break;
    default:
      icon.textContent = '⭐';
      name.textContent = powerUpName || 'POWER-UP';
  }

  // Show indicator
  indicator.style.display = 'flex';

  // Only log in debug mode to reduce console spam
  if (DEBUG_MODE_INVENTORY) {
    debugLog(`🎯 Power-Up Indicator: ${powerUpName || powerUpType} activated`);
  }
};

window.hidePowerUpIndicator = function() {
  const indicator = document.getElementById('powerUpIndicator');
  if (indicator) {
    indicator.style.display = 'none';

    // Only log in debug mode to reduce console spam
    if (DEBUG_MODE_INVENTORY) {
      debugLog('🎯 Power-Up Indicator hidden');
    }
  }
};

// Global function to stop all power-up sounds
window.stopAllPowerUpSounds = function() {
  if (window.audio?.stopPowerUpSounds) {
    window.audio.stopPowerUpSounds();
  }
};

/* --------------------------------------------------------------------
 *  ENHANCED POWER-UP ANIMATION TEST FUNCTIONS
 * ------------------------------------------------------------------ */

// Individual animation tests with proper sound stopping
window.testStormAnimation = function() {
  debugLog("🌪️ Testing Storm Animation (5 seconds)...");

  const board = document.getElementById("board");
  if (!board) {
    console.error("Board element not found");
    return;
  }

  // Start storm animation and sound
  board.classList.add("storm-effect");
  if (window.showPowerUpIndicator) {
    window.showPowerUpIndicator('storm', 'Storm Block');
  }
  if (window.audio?.stormSound) {
    window.audio.stormSound.play();
  }

  debugLog("🌪️ Storm animation started with sound");

  // Stop after 5 seconds
  setTimeout(() => {
    board.classList.remove("storm-effect");
    if (window.audio?.stopStormSound) {
      window.audio.stopStormSound();
    }
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
    debugLog("🌪️ Storm animation and sound stopped");
  }, 5000);
};

window.testElectroAnimation = function() {
  debugLog("⚡ Testing Electro Animation (5 seconds)...");

  const board = document.getElementById("board");
  if (!board) {
    console.error("Board element not found");
    return;
  }

  // Start electro animation and sound
  board.classList.add("electro-effect");
  if (window.showPowerUpIndicator) {
    window.showPowerUpIndicator('electro', 'Electro Stack');
  }
  if (window.audio?.electroSound) {
    window.audio.electroSound.play();
  }

  debugLog("⚡ Electro animation started with sound");

  // Stop after 5 seconds
  setTimeout(() => {
    board.classList.remove("electro-effect");
    if (window.audio?.stopElectroSound) {
      window.audio.stopElectroSound();
    }
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
    debugLog("⚡ Electro animation and sound stopped");
  }, 5000);
};

window.testExtendAnimation = function() {
  debugLog("🔄 Testing Extend Animation (5 seconds)...");

  const board = document.getElementById("board");
  if (!board) {
    console.error("Board element not found");
    return;
  }

  // Start extend animation and sound
  board.classList.add("extend-effect");
  if (window.showPowerUpIndicator) {
    window.showPowerUpIndicator('extend', 'Extend Block');
  }
  if (window.audio?.extendSound) {
    window.audio.extendSound.play();
  }

  debugLog("🔄 Extend animation started with sound");

  // Stop after 5 seconds
  setTimeout(() => {
    board.classList.remove("extend-effect");
    if (window.audio?.stopExtendSound) {
      window.audio.stopExtendSound();
    }
    if (window.hidePowerUpIndicator) {
      window.hidePowerUpIndicator();
    }
    debugLog("🔄 Extend animation and sound stopped");
  }, 5000);
};

// Test all animations sequentially
window.testAllAnimations = function() {
  debugLog("🎬 Testing All Power-Up Animations Sequentially...");
  debugLog("Each animation will run for 5 seconds with sound, then stop properly");

  window.testStormAnimation();

  setTimeout(() => {
    window.testElectroAnimation();
  }, 6000);

  setTimeout(() => {
    window.testExtendAnimation();
  }, 12000);

  setTimeout(() => {
    debugLog("✅ All power-up animation tests completed!");
  }, 18000);
};

// Show available animation tests
window.testPowerUpAnimations = function() {
  debugLog("🎬 POWER-UP ANIMATION TESTS");
  debugLog("═══════════════════════════════════════");
  debugLog("📋 Available Test Commands:");
  debugLog("• testStormAnimation() - Storm effects (5s)");
  debugLog("• testElectroAnimation() - Lightning effects (5s)");
  debugLog("• testExtendAnimation() - Expansion effects (5s)");
  debugLog("• testAllAnimations() - All effects sequentially (18s)");
  debugLog("• stopAllPowerUpSounds() - Stop all sounds immediately");
};

/* --------------------------------------------------------------------
 *  Public API Methods for Power-Up System
 * ------------------------------------------------------------------ */

/**
 * Public method to clear full lines on the board
 * Used by power-ups that need to trigger line clearing
 */
function clearLines() {
  return _clearLines();
}

/**
 * Public method to check if there are full lines
 * Used by power-ups to determine if clearing is needed
 */
function hasFullLines() {
  return _hasFullLines();
}

/* --------------------------------------------------------------------
 *  Robust inventory regeneration helper for power-ups
 * ------------------------------------------------------------------ */

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE_INVENTORY = false;

// Utility function for conditional logging
function debugLogInventory(...args) {
  if (DEBUG_MODE_INVENTORY) {
    debugLog(...args);
  }
}

export function regenerateInventoryAfterPowerUp(gameState, powerUpName = "Power-up") {
  debugLogInventory(`${powerUpName}: Starting inventory regeneration...`);

  // Clear inventory first
  gameState.playerPieces = [];

  // Force render empty inventory immediately
  if (window.player?.renderPieces) {
    window.player.renderPieces();
  }

  // Generate new pieces with retry logic
  setTimeout(() => {
    try {
      if (window.player?.generatePieces) {
        window.player.generatePieces();
        debugLogInventory(`${powerUpName}: Generated ${gameState.playerPieces.length} new pieces`);
      } else {
        console.error(`${powerUpName}: player.generatePieces not available`);
      }

      // Render the new pieces
      if (window.player?.renderPieces) {
        window.player.renderPieces();
        debugLogInventory(`${powerUpName}: Inventory rendered successfully`);
      } else {
        console.error(`${powerUpName}: player.renderPieces not available`);
      }

      // Final validation
      if (gameState.playerPieces.length === 0) {
        console.warn(`${powerUpName}: No pieces generated, retrying...`);
        // Retry once after a short delay
        setTimeout(() => {
          if (window.player?.generatePieces) {
            window.player.generatePieces();
            if (window.player?.renderPieces) {
              window.player.renderPieces();
            }
            debugLogInventory(`${powerUpName}: Retry successful, ${gameState.playerPieces.length} pieces`);
          }
        }, 500);
      }

    } catch (error) {
      console.error(`${powerUpName}: Error during inventory regeneration:`, error);
    }
  }, 100); // Small delay to ensure DOM is ready
}

// Global test functions for power-up inventory regeneration
window.testExtendBlock = function() {
  debugLog("🔬 Testing Extend Block...");

  // Clear board first
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      window.state.playerBoard[r][c] = 0;
      const cell = window.state.boardCells[r][c];
      if (cell) {
        cell.classList.remove('filled', 'rainbow');
        cell.style.background = '';
        cell.innerHTML = '';
      }
    }
  }

  // Add extend block to inventory
  window.state.playerPieces = [{
    shape: [[0, 0]],
    color: '#ff9500',
    isExtend: true
  }];

  window.player.renderPieces();
  debugLog("✅ Extend block added to inventory");
  debugLog("Execute extend effect...");

  window.extendBlock.execute(5, 5, window.state);
};

window.testStormBlock = function() {
  debugLog("🔬 Testing Storm Block...");

  // Add some test blocks
  const testPositions = [[2, 2], [2, 3], [4, 4], [6, 6]];
  testPositions.forEach(([r, c]) => {
    window.state.playerBoard[r][c] = 1;
    const cell = window.state.boardCells[r][c];
    if (cell) {
      cell.classList.add('filled');
      cell.style.background = '#FF6B6B';
    }
  });

  // Add storm block to inventory
  window.state.playerPieces = [{
    shape: [[0, 0]],
    color: '#4a90e2',
    isStorm: true
  }];

  window.player.renderPieces();
  debugLog("✅ Storm block added to inventory");
  debugLog("Execute storm effect...");

  window.stormBlock.execute(0, 0, window.state);
};

window.testElectroBlock = function() {
  debugLog("🔬 Testing Electro Block...");

  // Add test blocks around position (5,5)
  const testBlocks = [
    [4, 4], [4, 5], [4, 6],
    [5, 4],         [5, 6],
    [6, 4], [6, 5], [6, 6]
  ];

  testBlocks.forEach(([r, c]) => {
    window.state.playerBoard[r][c] = 1;
    const cell = window.state.boardCells[r][c];
    if (cell) {
      cell.classList.add('filled');
      cell.style.background = '#FF6B6B';
    }
  });

  // Add electro block to inventory
  window.state.playerPieces = [{
    shape: [[0, 0]],
    color: '#FFD700',
    isElectro: true
  }];

  window.player.renderPieces();
  debugLog("✅ Electro block added to inventory");
  debugLog("Execute electro effect...");

  window.electroStack.execute(5, 5, window.state);
};

debugLog("🧪 Power-up test functions available:");
debugLog("- testExtendBlock()");
debugLog("- testStormBlock()");
debugLog("- testElectroBlock()");
debugLog("- testInventoryRegeneration()");
debugLog("- testPowerUpInventoryFlow()");

/* --------------------------------------------------------------------
 *  ENHANCED POWER-UP ANIMATIONS - IMPLEMENTATION COMPLETE
 * ------------------------------------------------------------------ */

// Test commands for demonstration (available in browser console):
debugLog("\n🎬 ENHANCED POWER-UP ANIMATIONS - READY FOR TESTING");
debugLog("═══════════════════════════════════════════════════════");
debugLog("💫 Visual Effects: Enhanced board-wide animations for each power-up");
debugLog("🔊 Audio Effects: Power-up specific sound effects during events");
debugLog("🎯 Visual Indicator: Shows active power-up with progress animation");
debugLog("\n📋 Available Test Commands:");
debugLog("• testPowerUpAnimations() - Show all available animation tests");
debugLog("• testStormAnimation() - Test storm swirling effects (5s)");
debugLog("• testElectroAnimation() - Test electrical lightning effects (5s)");
debugLog("• testExtendAnimation() - Test expansion wave effects (5s)");
debugLog("• testAllAnimations() - Sequential demonstration of all effects (18s)");
debugLog("\n🎮 Power-Up Testing:");
debugLog("• testStormBlock() - Full storm power-up with blocks");
debugLog("• testElectroBlock() - Full electro power-up with targets");
debugLog("• testExtendBlock() - Full extend power-up demonstration");
debugLog("═══════════════════════════════════════════════════════\n");

// Complete Power-Up Animation Demo
window.testPowerUpAnimationDemo = function() {
  debugLog("🎬 COMPLETE POWER-UP ANIMATION DEMONSTRATION");
  debugLog("This will test all enhanced features in sequence:");
  debugLog("1. Visual indicators");
  debugLog("2. Board-wide animations");
  debugLog("3. Sound effects");
  debugLog("4. Animation cleanup");

  let demoStep = 0;
  const steps = [
    {
      name: "Storm Power-Up",
      emoji: "🌪️",
      test: () => window.testStormAnimation(),
      description: "Swirling storm effects with wind sound"
    },
    {
      name: "Electro Power-Up",
      emoji: "⚡",
      test: () => window.testElectroAnimation(),
      description: "Lightning effects with electrical sound"
    },
    {
      name: "Extend Power-Up",
      emoji: "🔄",
      test: () => window.testExtendAnimation(),
      description: "Expansion waves with extend sound"
    }
  ];

  function runStep() {
    if (demoStep >= steps.length) {
      debugLog("✅ Demo complete! All power-up animations tested successfully.");
      return;
    }

    const step = steps[demoStep];
    debugLog(`\n${step.emoji} Testing: ${step.name}`);
    debugLog(`Description: ${step.description}`);
    debugLog("─".repeat(50));

    step.test();
    demoStep++;

    setTimeout(() => {
      runStep();
    }, 6000); // 6 seconds between tests
  }

  runStep();
};

// Audio Pool Management for Power-Up Sounds
window.testAudioSystem = function() {
  debugLog("🔊 Testing Audio System for Power-Ups");
  debugLog("Available sounds:");

  const sounds = [
    { name: "Storm", sound: window.audio?.stormSound, file: "wind.wav" },
    { name: "Electro", sound: window.audio?.electroSound, file: "Electro.wav" },
    { name: "Extend", sound: window.audio?.extendSound, file: "extend.flac" }
  ];

  sounds.forEach(({ name, sound, file }) => {
    if (sound && typeof sound.play === 'function') {
      debugLog(`✅ ${name}: Ready (${file})`);

      // Test play with rate limiting
      try {
        sound.play();
        debugLog(`🎵 ${name} sound played`);
      } catch (error) {
        console.warn(`⚠️ ${name} sound play failed:`, error);
      }
    } else {
      debugLog(`❌ ${name}: Not available (${file})`);
    }
  });

  debugLog("\nNote: HTML5 Audio pool warnings are normal during rapid testing.");
  debugLog("In normal gameplay, sounds are spaced out and won't cause issues.");
};

/* ═══════════════════════════════════════════════════════════════════
 * ENHANCED POWER-UP TESTING FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════ */

// Enhanced Power-Up Showcase Functions
window.testEnhancedPowerUpDesigns = function() {
  console.log("🎨 ENHANCED POWER-UP DESIGN SHOWCASE");
  console.log("Testing the new elegant, modern power-up designs:");

  // Clear current inventory
  if (window.state) {
    window.state.playerPieces = [];
  }

  // Add all three enhanced power-ups to inventory
  const enhancedPowerUps = [
    {
      shape: [[0, 0]],
      color: '#4a90e2',
      isStorm: true
    },
    {
      shape: [[0, 0]],
      color: '#FFD700',
      isElectro: true
    },
    {
      shape: [[0, 0]],
      color: '#ff9500',
      isExtend: true
    }
  ];

  if (window.state) {
    window.state.playerPieces = enhancedPowerUps;
  }

  if (window.player?.renderPieces) {
    window.player.renderPieces();
  }

  console.log("✨ Enhanced Power-Up Features:");
  console.log("🌪️ Storm Block: 40% larger, tornado vortex effect, orbital rotation");
  console.log("⚡ Electro Stack: 50% larger, lightning flicker, energy field rotation");
  console.log("🔄 Extend Block: 35% larger, organic growth waves, rhythmic expansion");
  console.log("💫 All power-ups have unique hover effects and enhanced visual distinction");
  console.log("🎮 Hover over the power-ups to see the interactive effects!");
};

window.showPowerUpComparison = function() {
  console.log("📊 POWER-UP DESIGN COMPARISON");
  console.log("═══════════════════════════════════════════");
  console.log("BEFORE (Old Design):");
  console.log("• Standard 1x1 size in inventory");
  console.log("• Simple gradient backgrounds");
  console.log("• Basic rotation/pulse animations");
  console.log("• Similar visual appearance");
  console.log("");
  console.log("AFTER (Enhanced Design):");
  console.log("🌪️ Storm Block:");
  console.log("  • 40% larger display");
  console.log("  • Conic gradient tornado vortex");
  console.log("  • Orbital rotation background");
  console.log("  • Spinning tornado emoji");
  console.log("  • Dynamic color hue rotation");
  console.log("");
  console.log("⚡ Electro Stack:");
  console.log("  • 50% larger display");
  console.log("  • Lightning flicker animation");
  console.log("  • Energy field rotation");
  console.log("  • Bright spark effects");
  console.log("  • High-contrast white/gold combo");
  console.log("");
  console.log("🔄 Extend Block:");
  console.log("  • 35% larger display");
  console.log("  • Organic growth wave patterns");
  console.log("  • Rhythmic expansion animation");
  console.log("  • Warm orange color palette");
  console.log("  • Central expansion effects");
  console.log("");
  console.log("🎨 All power-ups now have:");
  console.log("  • Unique visual identity");
  console.log("  • Enhanced hover interactions");
  console.log("  • Backdrop blur effects");
  console.log("  • Distinctive size scaling");
  console.log("  • Complex multi-layer animations");
};

// Add to existing debug functions
console.log("🎨 Enhanced Power-Up Design Functions:");
console.log("• testEnhancedPowerUpDesigns() - Show all enhanced power-ups");
console.log("• showPowerUpComparison() - Compare old vs new designs");

//# sourceMappingURL=player.js.map
