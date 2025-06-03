/* --------------------------------------------------------------------
 *  src/player.js   –   Logik für das Spieler-Brett
 * ------------------------------------------------------------------ */
import { state } from "./state.js";
import {
  ALL_POSSIBLE_SHAPES,
  LANG,
  getRandomRainbowColor,
} from "./constants.js";
import { placeSound, clearSound } from "./audio.js";
import { ui } from "./ui.js"; // für displayMessage
import { GridSnap } from "./drag.js";

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
    pieceDiv.className = "piece";
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
      block.className = "block rainbow";
      block.style.gridRowStart = r + 1;
      block.style.gridColumnStart = c + 1;
      block.style.background = color;
      block.style.transition = "transform 0.15s, box-shadow 0.15s";
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

  // Multiplikator berechnen (steigt mit Combos)
  if (state.consecutiveClears > 1) {
    state.currentMultiplier = Math.min(state.consecutiveClears, 8); // Maximum 8x
  } else {
    state.currentMultiplier = 1;
  }

  // Finale Punkte mit Multiplikator
  let finalPoints = basePoints * 10 * state.currentMultiplier;

  // Berechne die Gesamtzahl der gelöschten Linien für die Animation
  const totalLinesCleared = fullRows.length + fullCols.length;

  // Animationen anzeigen
  _showScoreAnimations(finalPoints, state.currentMultiplier, totalLinesCleared);

  state.playerScore += finalPoints;
  updateScoreDisplay();
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

/* --------------------------------------------------------------------
 *  Animationen für Punkte und Multiplikatoren anzeigen
 * ------------------------------------------------------------------ */
function _showScoreAnimations(points, multiplier, totalLinesCleared = 0) {
  console.log("_showScoreAnimations called:", {
    points,
    multiplier,
    totalLinesCleared,
  });

  // Multiplikator-Animation zeigen bei mehrfach-Linien oder Combos
  const shouldShowMultiplier = multiplier > 1 || totalLinesCleared > 1;
  console.log("shouldShowMultiplier:", shouldShowMultiplier);

  if (shouldShowMultiplier) {
    console.log("Calling _showMultiplierAnimation");
    _showMultiplierAnimation(multiplier, totalLinesCleared);
  }

  // Punkte-Animation bei hohen Werten (> 10 Punkte)
  if (points > 10) {
    console.log("Calling _showPointsAnimation with points:", points);
    // Kleine Verzögerung wenn auch Multiplikator-Animation läuft
    const delay = shouldShowMultiplier ? 500 : 0;
    setTimeout(() => {
      _showPointsAnimation(points);
    }, delay);
  }

  // Score-Display Combo-Animation
  if (multiplier > 1 || points > 10) {
    const scoreDisplay = document.querySelector("#playerArea .scoreDisplay");
    if (scoreDisplay) {
      scoreDisplay.classList.add("score-combo");
      setTimeout(() => {
        scoreDisplay.classList.remove("score-combo");
      }, 1500);
    }
  }
}

function _showMultiplierAnimation(multiplier, totalLinesCleared = 0) {
  console.log("_showMultiplierAnimation called:", {
    multiplier,
    totalLinesCleared,
  });

  // Stelle sicher, dass gameArea sichtbar ist
  const gameArea = document.getElementById("gameArea");
  if (!gameArea || gameArea.style.display === "none") {
    console.log("gameArea not visible, skipping animation");
    return;
  }

  let multiplierDisplay = document.getElementById("multiplierDisplay");
  let multiplierText = multiplierDisplay?.querySelector(".multiplier-text");

  // Falls Elemente nicht existieren, erstelle sie dynamisch
  if (!multiplierDisplay) {
    console.log("Creating multiplierDisplay dynamically");
    const board = document.getElementById("board");
    if (!board) {
      console.error("Board element not found!");
      return;
    }

    multiplierDisplay = document.createElement("div");
    multiplierDisplay.id = "multiplierDisplay";
    multiplierDisplay.className = "multiplier-display";
    multiplierDisplay.style.display = "none";

    multiplierText = document.createElement("div");
    multiplierText.className = "multiplier-text";
    multiplierDisplay.appendChild(multiplierText);

    board.appendChild(multiplierDisplay);
  }

  if (!multiplierText) {
    multiplierText = multiplierDisplay.querySelector(".multiplier-text");
  }

  console.log("DOM elements found:", {
    multiplierDisplay: !!multiplierDisplay,
    multiplierText: !!multiplierText,
  });

  if (!multiplierDisplay || !multiplierText) {
    console.error("Animation elements still not found after creation!");
    return;
  }

  let displayText = "";

  // Zeige entsprechende Animation je nach Situation
  if (totalLinesCleared >= 2 && multiplier > 1) {
    // Mehrfach-Linien UND Combo - kürzer und prägnanter
    displayText = `X${totalLinesCleared} + X${multiplier} COMBO!`;
  } else if (totalLinesCleared >= 2) {
    // Nur mehrfach-Linien - einfacher X2, X3, etc.
    displayText = `X${totalLinesCleared} MULTI!`;
  } else if (multiplier > 1) {
    // Nur Combo
    displayText = `X${multiplier} COMBO!`;
  }

  multiplierText.textContent = displayText;
  multiplierDisplay.style.display = "block";

  console.log("Animation started with text:", displayText);
  console.log(
    "multiplierDisplay style.display set to:",
    multiplierDisplay.style.display
  );

  setTimeout(() => {
    multiplierDisplay.style.display = "none";
    console.log("Animation ended, display set to none");
  }, 2500);
}

function _showPointsAnimation(points) {
  console.log("_showPointsAnimation called with points:", points);

  // Stelle sicher, dass gameArea sichtbar ist
  const gameArea = document.getElementById("gameArea");
  if (!gameArea || gameArea.style.display === "none") {
    console.log("gameArea not visible, skipping points animation");
    return;
  }

  let pointsAnimation = document.getElementById("pointsAnimation");
  let pointsText = pointsAnimation?.querySelector(".points-text");

  // Falls Elemente nicht existieren, erstelle sie dynamisch
  if (!pointsAnimation) {
    console.log("Creating pointsAnimation dynamically");
    const board = document.getElementById("board");
    if (!board) {
      console.error("Board element not found!");
      return;
    }

    pointsAnimation = document.createElement("div");
    pointsAnimation.id = "pointsAnimation";
    pointsAnimation.className = "points-animation";
    pointsAnimation.style.display = "none";

    pointsText = document.createElement("div");
    pointsText.className = "points-text";
    pointsAnimation.appendChild(pointsText);

    board.appendChild(pointsAnimation);
  }

  if (!pointsText) {
    pointsText = pointsAnimation.querySelector(".points-text");
  }

  console.log("Points animation DOM elements:", {
    pointsAnimation: !!pointsAnimation,
    pointsText: !!pointsText,
  });

  if (!pointsAnimation || !pointsText) {
    console.error("Points animation elements still not found after creation!");
    return;
  }

  pointsText.textContent = `+${points}`;

  // Reset animation by briefly hiding and showing the element
  pointsAnimation.style.display = "none";
  // Force reflow to ensure the style change takes effect
  pointsAnimation.offsetHeight;
  pointsAnimation.style.display = "block";

  console.log("Points animation started with text:", `+${points}`);

  setTimeout(() => {
    pointsAnimation.style.display = "none";
    console.log("Points animation ended");
  }, 2000);
}

/* --------------------------------------------------------------------
 *  Punkteanzeige bumpen
 * ------------------------------------------------------------------ */
function updateScoreDisplay() {
  if (state.el.score) state.el.score.textContent = state.playerScore;
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

  // CPU-Modus: Spielende wenn beide keine Züge mehr haben oder wenn Spieler CPU nach beendetem KI-Zug überholt
  if (state.currentMode === "cpu") {
    console.log("CPU-Modus");

    // Wenn keine Pieces mehr, neue Pieces generieren (unabhängig von hasMoves)
    if (state.playerPieces.length === 0) {
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
    if (state.playerPieces.length === 0) {
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
