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
    // Remove the power-up piece from inventory
    const idx = state.playerPieces.findIndex(
      (sh) =>
        (sh.shape || sh) === shape ||
        (Array.isArray(sh.shape) &&
          JSON.stringify(sh.shape) === JSON.stringify(shape))
    );
    if (idx !== -1) state.playerPieces.splice(idx, 1);
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
  state.playerScore += shape.length;
  updateScoreDisplay();

  // Merke den Zustand vor dem Löschen für Combo-Logic
  const hadLinesBeforeClearing = _hasFullLines();
  _clearLines();

  // Falls keine Linien gelöscht wurden, Combo zurücksetzen
  if (!hadLinesBeforeClearing) {
    state.consecutiveClears = 0;
    state.currentMultiplier = 1;
  }

  // Entferne das platzte Piece aus dem Inventar
  const idx = state.playerPieces.findIndex(
    (sh) =>
      (sh.shape || sh) === shape ||
      (Array.isArray(sh.shape) &&
        JSON.stringify(sh.shape) === JSON.stringify(shape))
  );
  if (idx !== -1) state.playerPieces.splice(idx, 1);
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
  console.log(`Permanent multiplier increased from ${oldPermanentMultiplier.toFixed(0)}x to ${state.permanentMultiplier.toFixed(0)}x`);

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
}

/* --------------------------------------------------------------------
 *  Score Animation Functions
 * ------------------------------------------------------------------ */
function _showScoreAnimations(finalPoints, currentMultiplier, totalLinesCleared) {
  console.log(`Showing score animations: ${finalPoints} points, ${currentMultiplier}x multiplier, ${totalLinesCleared} lines cleared`);

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
  console.log(`Showing multiplier animation: ${multiplier}x multiplier, ${comboCount} combo`);

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
  console.log(`Showing points animation: +${points} points`);

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
  console.log("Testing animations...");
  _showMultiplierAnimation(2, 2);
  setTimeout(() => {
    _showPointsAnimation(50);
  }, 1000);
}

// Test-Funktion global verfügbar machen
window.testAnimations = testAnimations;

// Test function for permanent multiplier
window.testPermanentMultiplier = function() {
  console.log("Testing permanent multiplier...");
  console.log("Current permanent multiplier:", state.permanentMultiplier);

  // Simulate line clearing to increase permanent multiplier
  state.permanentMultiplier += 1;
  console.log("Increased permanent multiplier to:", state.permanentMultiplier);

  // Update display
  updatePermanentMultiplierDisplay();

  // Test CPU permanent multiplier too
  state.cpuPermanentMultiplier += 1;
  console.log("Increased CPU permanent multiplier to:", state.cpuPermanentMultiplier);

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
    console.log("Storm piece forced in inventory!");
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

  console.log("Test blocks added to board!");
};

/* --------------------------------------------------------------------
 *  Punkteanzeige bumpen
 * ------------------------------------------------------------------ */
function updateScoreDisplay() {
  if (state.el.score) state.el.score.textContent = state.playerScore;
}

/* --------------------------------------------------------------------
 *  Permanent Multiplier Display Update
 * ------------------------------------------------------------------ */
function updatePermanentMultiplierDisplay() {
  console.log("updatePermanentMultiplierDisplay called, permanentMultiplier:", state.permanentMultiplier);
  const multiplierElement = document.getElementById("playerPermanentMultiplier");
  const multiplierValueElement = multiplierElement?.querySelector(".multiplier-value");

  if (multiplierElement && multiplierValueElement) {
    // Show the multiplier display when it's above 1.0
    if (state.permanentMultiplier > 1.0) {
      console.log("Showing permanent multiplier display:", state.permanentMultiplier.toFixed(0) + "x");
      multiplierElement.style.display = "flex";
      // Format as whole number since we increment by 1
      multiplierValueElement.textContent = `${state.permanentMultiplier.toFixed(0)}x`;
    } else {
      console.log("Hiding permanent multiplier display");
      multiplierElement.style.display = "none";
    }
  } else {
    console.log("Could not find permanent multiplier elements");
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
  console.log("checkGameOverCondition aufgerufen");

  // Skip game over check during storm animation
  if (state.stormAnimationActive) {
    console.log("Storm animation active, skipping game over check");
    return;
  }

  // CPU-Modus: Spielende wenn beide keine Züge mehr haben oder wenn Spieler CPU nach beendetem KI-Zug überholt
  if (state.currentMode === "cpu") {
    console.log("CPU-Modus");

    // Wenn keine Pieces mehr, neue Pieces generieren (unabhängig von hasMoves)
    // ABER NICHT während einer Storm-Animation
    if (state.playerPieces.length === 0 && !state.stormAnimationActive) {
      console.log("Keine Player Pieces mehr, generiere neue");
      generatePieces();
      renderPieces();
    }

    // Nach dem Generieren prüfen, ob jetzt noch Züge möglich sind
    if (!hasMoves()) {
      console.log("Keine Züge mehr möglich");
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
        console.log("CPU nicht aktiv, Spiel beenden");
        const playerWon = state.playerScore >= state.cpuScore;
        finishGame(playerWon);
      }
      return;
    }

    if (!state.cpuGameActive) {
      console.log("CPU nicht aktiv");
      if (state.playerScore > state.cpuScore) {
        console.log("Player Score höher als CPU Score, Spiel beenden");
        finishGame(true);
        return;
      }
      if (!hasMoves()) {
        console.log("Keine Züge mehr möglich, Spiel beenden");
        const playerWon = state.playerScore >= state.cpuScore;
        finishGame(playerWon);
      }
    }
    return;
  }

  // PvP: nur Pieces nachfüllen, keine lokale Spielbeendigung (Server steuert Ende)
  if (state.currentMode === "player") {
    console.log("PvP-Modus");

    // Skip game over check during storm animation
    if (state.stormAnimationActive) {
      console.log("Storm animation active in PvP, skipping checks");
      return;
    }

    if (state.playerPieces.length === 0 && !state.stormAnimationActive) {
      console.log("Keine Player Pieces mehr, generiere neue");
      generatePieces();
      renderPieces();
    }
    if (!hasMoves()) {
      console.log("Keine Züge mehr möglich, Spielende an Server melden");
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
  console.log("finishGame aufgerufen", { playerWon, msgOverride });
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
    console.log("CPU-Modus: warte bis CPU fertig");
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

// Test functions for the modular power-up system
window.testPowerUpSystem = function() {
  console.log("=== MODULAR POWER-UP SYSTEM TEST ===");

  if (!window.powerUpRegistry) {
    console.log("❌ Power-up registry not available!");
    return;
  }

  // Test Storm Block
  console.log("\n🌪️ Testing Storm Block:");
  const stormPiece = window.powerUpRegistry.stormBlock.createPiece();
  state.playerPieces = [stormPiece];
  renderPieces();
  console.log("✅ Storm Block added to inventory");

  // Test Electro Stack
  console.log("\n⚡ Testing Electro Stack:");
  const electroPiece = window.powerUpRegistry.electroStack.createPiece();
  state.playerPieces = [electroPiece];
  renderPieces();
  console.log("✅ Electro Stack added to inventory");

  console.log("\n🎯 Test completed! Try placing the power-ups on the board.");
};

// Automatic system verification test
window.verifyPowerUpSystem = function() {
  console.log("🔧 VERIFYING MODULAR POWER-UP SYSTEM:");

  if (!window.powerUpRegistry) {
    console.log("❌ Power-up registry not available!");
    return false;
  }

  // Check if registry has the required power-ups
  const hasStorm = window.powerUpRegistry.stormBlock !== undefined;
  const hasElectro = window.powerUpRegistry.electroStack !== undefined;

  console.log(`🌪️ Storm Block available: ${hasStorm ? '✅' : '❌'}`);
  console.log(`⚡ Electro Stack available: ${hasElectro ? '✅' : '❌'}`);

  // Check if registry methods are available
  const hasGeneration = typeof window.powerUpRegistry.applyPowerUpGeneration === 'function';
  const hasStyling = typeof window.powerUpRegistry.applyPowerUpStyling === 'function';
  const hasExecution = typeof window.powerUpRegistry.executePowerUp === 'function';

  console.log(`🎲 Generation method: ${hasGeneration ? '✅' : '❌'}`);
  console.log(`🎨 Styling method: ${hasStyling ? '✅' : '❌'}`);
  console.log(`⚡ Execution method: ${hasExecution ? '✅' : '❌'}`);

  const allGood = hasStorm && hasElectro && hasGeneration && hasStyling && hasExecution;
  console.log(`\n🎯 System Status: ${allGood ? '✅ OPERATIONAL' : '❌ ERRORS DETECTED'}`);

  return allGood;
};

// Run verification on load
setTimeout(() => {
  verifyPowerUpSystem();
}, 1000);

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
