/* --------------------------------------------------------------------
 *  src/player.js   –   Logik für das Spieler-Brett
 * ------------------------------------------------------------------ */
import {
  ALL_POSSIBLE_SHAPES,
  ELECTRO_SHAPE,
  getRandomRainbowColor,
  LANG,
  STORM_SHAPE,
} from "./constants.js";
import { GridSnap } from "./drag.js";
import { state } from "./state.js";
import { ui } from "./ui.js"; // für displayMessage

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

  // 10% Chance für Storm Power-Up (ersetzt ein zufälliges Piece)
  if (Math.random() < 0.1 && state.playerPieces.length > 0) {
    const randomIndex = Math.floor(Math.random() * state.playerPieces.length);
    state.playerPieces[randomIndex] = {
      shape: STORM_SHAPE.map((c) => [...c]),
      color: '#4a90e2',
      isStorm: true
    };
  }

  // 5% Chance für Elektro Stack Power-Up (ersetzt ein anderes Piece, falls noch verfügbar)
  if (Math.random() < 0.05 && state.playerPieces.length > 1) {
    // Finde ein Piece das noch kein Powerup ist
    const availableIndices = state.playerPieces
      .map((piece, index) => !piece.isStorm && !piece.isElectro ? index : -1)
      .filter(index => index !== -1);

    if (availableIndices.length > 0) {
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      state.playerPieces[randomIndex] = {
        shape: ELECTRO_SHAPE.map((c) => [...c]),
        color: '#FFD700',
        isElectro: true
      };
    }
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
    const isStorm = pieceObj.isStorm || false;
    const isElectro = pieceObj.isElectro || false;

    // Bestimme die Dimensionen des Shapes für das Grid-Layout
    let maxR = 0,
      maxC = 0;
    shape.forEach(([r, c]) => {
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    });

    const pieceDiv = document.createElement("div");
    let pieceClass = "piece";
    if (isStorm) pieceClass += " storm-piece";
    if (isElectro) pieceClass += " electro-piece";
    pieceDiv.className = pieceClass;
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
      let blockClass = "block";
      if (isStorm) {
        blockClass += " storm-block";
      } else if (isElectro) {
        blockClass += " electro-block";
      } else {
        blockClass += " rainbow";
      }
      block.className = blockClass;
      block.style.gridRowStart = r + 1;
      block.style.gridColumnStart = c + 1;
      block.style.background = color;
      block.style.transition = "transform 0.15s, box-shadow 0.15s";

      // Add storm-specific styling
      if (isStorm) {
        block.innerHTML = '🌪️'; // Storm emoji as content
        block.style.fontSize = `${cellPx * 0.6}px`;
        block.style.display = 'flex';
        block.style.alignItems = 'center';
        block.style.justifyContent = 'center';
        block.style.textAlign = 'center';
        block.style.backgroundImage = 'radial-gradient(circle, #4a90e2, #2171b5)';
        block.style.boxShadow = '0 0 10px rgba(74, 144, 226, 0.6)';
      }

      // Add electro-specific styling
      if (isElectro) {
        block.innerHTML = '⚡'; // Lightning emoji as content
        block.style.fontSize = `${cellPx * 0.6}px`;
        block.style.display = 'flex';
        block.style.alignItems = 'center';
        block.style.justifyContent = 'center';
        block.style.textAlign = 'center';
        block.style.backgroundImage = 'linear-gradient(135deg, #FFD700, #FFA500)';
        block.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
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

  // Prüfe ob es sich um ein Storm Piece handelt
  if (pieceObj?.isStorm) {
    console.log("Storm piece placed! Executing storm effect...");
    _executeStormEffect();

    // Entferne das Storm-Piece aus dem Inventar
    const idx = state.playerPieces.findIndex(
      (sh) =>
        (sh.shape || sh) === shape ||
        (Array.isArray(sh.shape) &&
          JSON.stringify(sh.shape) === JSON.stringify(shape))
    );
    if (idx !== -1) state.playerPieces.splice(idx, 1);
    return; // Verlasse die Funktion früh für Storm-Pieces
  }

  // Prüfe ob es sich um ein Elektro Piece handelt
  if (pieceObj?.isElectro) {
    console.log("Elektro piece placed! Executing electro effect...");
    _executeElectroEffect(br, bc);

    // Entferne das Elektro-Piece aus dem Inventar
    const idx = state.playerPieces.findIndex(
      (sh) =>
        (sh.shape || sh) === shape ||
        (Array.isArray(sh.shape) &&
          JSON.stringify(sh.shape) === JSON.stringify(shape))
    );
    if (idx !== -1) state.playerPieces.splice(idx, 1);
    return; // Verlasse die Funktion früh für Elektro-Pieces
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
 *  Storm Power-Up Funktionen
 * ------------------------------------------------------------------ */
function _isStormPiece(pieceObj) {
  // Prüft ob es sich um ein Storm-Piece handelt
  return pieceObj?.isStorm === true;
}

function _executeStormEffect() {
  console.log("Storm effect activated!");

  // 1. Sammle alle gefüllten Blöcke vom Spielfeld
  const filledBlocks = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (state.playerBoard[r][c] === 1) {
        const cell = state.boardCells[r][c];
        filledBlocks.push({
          row: r,
          col: c,
          color: cell.style.background,
          hasRainbow: cell.classList.contains('rainbow')
        });
        // Entferne Block vom Brett
        state.playerBoard[r][c] = 0;
        cell.classList.remove("filled", "rainbow");
        cell.style.background = "";
      }
    }
  }

  if (filledBlocks.length === 0) {
    // Kein Effekt wenn keine Blöcke vorhanden
    _regenerateInventoryAfterStorm();
    return;
  }

  // 2. Storm-Animation auf dem Board
  _showStormAnimation();

  // 3. Nach kurzer Verzögerung: Blöcke zufällig neu verteilen
  setTimeout(() => {
    _shuffleAndPlaceBlocks(filledBlocks);
  }, 800);
}

function _showStormAnimation() {
  const boardElement = document.getElementById("board");
  if (boardElement) {
    boardElement.classList.add("storm-effect");

    // Animation für 1.5 Sekunden
    setTimeout(() => {
      boardElement.classList.remove("storm-effect");
    }, 1500);
  }
}

function _shuffleAndPlaceBlocks(blocks) {
  // Erstelle Array mit allen freien Positionen
  const freePositions = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (state.playerBoard[r][c] === 0) {
        freePositions.push({ row: r, col: c });
      }
    }
  }

  // Mische die freien Positionen
  for (let i = freePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freePositions[i], freePositions[j]] = [freePositions[j], freePositions[i]];
  }

  // Platziere Blöcke an zufälligen Positionen mit Animation
  blocks.forEach((block, index) => {
    if (index < freePositions.length) {
      const newPos = freePositions[index];

      setTimeout(() => {
        // Setze Block in neuer Position
        state.playerBoard[newPos.row][newPos.col] = 1;
        const cell = state.boardCells[newPos.row][newPos.col];

        if (cell) {
          cell.classList.add("filled");
          if (block.hasRainbow) {
            cell.classList.add("rainbow");
          }
          cell.style.background = block.color;

          // Platzierungs-Animation
          cell.classList.add("storm-placed");
          setTimeout(() => {
            cell.classList.remove("storm-placed");
          }, 300);
        }

        // Nach dem letzten Block: Inventar neu generieren
        if (index === blocks.length - 1) {
          setTimeout(() => {
            _regenerateInventoryAfterStorm();
          }, 500);
        }
      }, index * 50); // Gestaggerte Animation
    }
  });
}

function _regenerateInventoryAfterStorm() {
  console.log("Regenerating inventory after storm...");

  // Leere das aktuelle Inventar
  state.playerPieces = [];

  // Generiere neues Inventar
  generatePieces();
  renderPieces();

  // Kurze Benachrichtigung
  _showStormCompleteMessage();
}

function _showStormCompleteMessage() {
  const messageDiv = document.createElement("div");
  messageDiv.className = "storm-complete-message";
  messageDiv.textContent = "🌪️ Sturm abgeschlossen! Neues Inventar generiert!";
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(138, 43, 226, 0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.8);
    backdrop-filter: blur(5px);
    animation: stormMessageFade 3s ease-out forwards;
  `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

/* --------------------------------------------------------------------
 *  Elektro Stack Power-Up Funktionen
 * ------------------------------------------------------------------ */
function _isElectroPiece(pieceObj) {
  // Prüft ob es sich um ein Elektro-Piece handelt
  return pieceObj?.isElectro === true;
}

function _executeElectroEffect(centerRow, centerCol) {
  console.log("Elektro Stack effect activated at position:", centerRow, centerCol);

  // Definiere die 8 umgebenden Positionen (alle Richtungen)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],  // oben-links, oben, oben-rechts
    [0, -1],           [0, 1],   // links, rechts
    [1, -1],  [1, 0],  [1, 1]    // unten-links, unten, unten-rechts
  ];

  const clearedBlocks = [];
  let totalClearedBlocks = 0;

  // Sammle alle Blöcke in den umgebenden Feldern
  directions.forEach(([dRow, dCol]) => {
    const targetRow = centerRow + dRow;
    const targetCol = centerCol + dCol;

    // Prüfe ob Position im Board ist
    if (targetRow >= 0 && targetRow < 10 && targetCol >= 0 && targetCol < 10) {
      if (state.playerBoard[targetRow][targetCol] === 1) {
        const cell = state.boardCells[targetRow][targetCol];
        clearedBlocks.push({
          row: targetRow,
          col: targetCol,
          cell: cell,
          color: cell.style.background,
          hasRainbow: cell.classList.contains('rainbow')
        });
        totalClearedBlocks++;
      }
    }
  });

  if (totalClearedBlocks === 0) {
    console.log("Keine Blöcke zum Löschen gefunden");
    _showElectroCompleteMessage(0, 0);
    return;
  }

  // Zeige Elektro-Animation
  _showElectroAnimation(centerRow, centerCol, clearedBlocks);

  // Nach Animation: Lösche die Blöcke und berechne Punkte
  setTimeout(() => {
    clearedBlocks.forEach(block => {
      state.playerBoard[block.row][block.col] = 0;
      block.cell.classList.remove("filled", "rainbow");
      block.cell.style.background = "";

      // Elektrische Lösch-Animation auf jedem Block
      block.cell.classList.add("electro-zapped");
      setTimeout(() => {
        block.cell.classList.remove("electro-zapped");
      }, 600);
    });

    // Berechne Punkte: 50 Punkte pro gelöschtem Block
    const pointsPerBlock = 50;
    const totalPoints = totalClearedBlocks * pointsPerBlock;

    // Erhöhe permanenten Multiplier um +1 pro gelöschtem Block
    const oldPermanentMultiplier = state.permanentMultiplier;
    state.permanentMultiplier += totalClearedBlocks;
    console.log(`Elektro Stack: Permanent multiplier increased from ${oldPermanentMultiplier.toFixed(0)}x to ${state.permanentMultiplier.toFixed(0)}x (+${totalClearedBlocks})`);

    // Füge Punkte mit aktuellen Multiplikatoren hinzu
    const finalPoints = totalPoints * state.currentMultiplier * state.permanentMultiplier;
    state.playerScore += finalPoints;

    // Update Displays
    updateScoreDisplay();
    updatePermanentMultiplierDisplay();

    // Zeige Abschlussnachricht
    _showElectroCompleteMessage(totalClearedBlocks, finalPoints);

    console.log(`Elektro Stack: ${totalClearedBlocks} Blöcke gelöscht, ${finalPoints} Punkte erhalten`);
  }, 800);
}

function _showElectroAnimation(centerRow, centerCol, targetBlocks) {
  const boardElement = document.getElementById("board");
  if (boardElement) {
    boardElement.classList.add("electro-effect");

    // Animation für das Board
    setTimeout(() => {
      boardElement.classList.remove("electro-effect");
    }, 1500);
  }

  // Animiere jeden zu löschenden Block einzeln
  targetBlocks.forEach((block, index) => {
    setTimeout(() => {
      block.cell.classList.add("electro-target");
      setTimeout(() => {
        block.cell.classList.remove("electro-target");
      }, 400);
    }, index * 50); // Gestaggerte Animation
  });
}

function _showElectroCompleteMessage(blocksCleared, pointsGained) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "electro-complete-message";

  let messageText = "⚡ Elektro Stack abgefeuert!";
  if (blocksCleared > 0) {
    messageText += ` ${blocksCleared} Blöcke gelöscht! +${pointsGained} Punkte!`;
  } else {
    messageText += " Keine Blöcke betroffen.";
  }

  messageDiv.textContent = messageText;
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
    backdrop-filter: blur(5px);
    animation: electroMessageFade 3s ease-out forwards;
    border: 2px solid #FFD700;
  `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
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

// Comprehensive test function for electro stack
window.testElectroComplete = function() {
  console.log("=== ELEKTRO STACK COMPLETE TEST ===");

  // Clear the board first
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      state.playerBoard[r][c] = 0;
      const cell = state.boardCells[r][c];
      if (cell) {
        cell.classList.remove('filled', 'rainbow');
        cell.style.background = '';
      }
    }
  }

  // Add an electro piece to inventory
  state.playerPieces = [{
    shape: [[0, 0]],
    color: '#FFD700',
    isElectro: true
  }];
  renderPieces();
  console.log("✅ Elektro piece added to inventory");

  // Add test blocks around position (5,5) in a 3x3 pattern
  const testBlocks = [
    [4, 4], [4, 5], [4, 6],
    [5, 4],         [5, 6],
    [6, 4], [6, 5], [6, 6]
  ];

  testBlocks.forEach(([r, c]) => {
    state.playerBoard[r][c] = 1;
    const cell = state.boardCells[r][c];
    if (cell) {
      cell.classList.add('filled', 'rainbow');
      cell.style.background = '#FF6B6B';
    }
  });

  const oldScore = state.playerScore;
  const oldMultiplier = state.permanentMultiplier;

  console.log(`✅ Added ${testBlocks.length} test blocks around (5,5)`);
  console.log(`📊 Score before: ${oldScore}, Permanent Multiplier before: ${oldMultiplier}x`);

  // Test the electro effect
  setTimeout(() => {
    console.log("🔥 Executing Elektro Stack effect...");
    _executeElectroEffect(5, 5);

    // Check results after the effect completes
    setTimeout(() => {
      const newScore = state.playerScore;
      const newMultiplier = state.permanentMultiplier;
      const scoreDiff = newScore - oldScore;
      const multiplierDiff = newMultiplier - oldMultiplier;

      console.log(`📊 Score after: ${newScore} (+${scoreDiff})`);
      console.log(`📊 Permanent Multiplier after: ${newMultiplier}x (+${multiplierDiff})`);
      console.log(`✅ Expected: 8 blocks cleared, +8 to multiplier, points = 8*50*currentMultiplier*newPermanentMultiplier`);

      // Verify blocks were cleared
      let remainingBlocks = 0;
      testBlocks.forEach(([r, c]) => {
        if (state.playerBoard[r][c] === 1) remainingBlocks++;
      });

      console.log(`🔍 Remaining blocks: ${remainingBlocks} (should be 0)`);

      if (remainingBlocks === 0 && multiplierDiff === testBlocks.length) {
        console.log("🎉 TEST PASSED: Elektro Stack working correctly!");
      } else {
        console.log("❌ TEST FAILED: Something went wrong");
      }
    }, 2000);
  }, 1000);
};

console.log("🧪 Elektro Stack Test Functions Available:");
console.log("- forceElectroPiece() : Add elektro piece to inventory");
console.log("- testElectroEffect() : Test the elektro effect with sample blocks");
console.log("- testElectroComplete() : Full comprehensive test");

// Final integration test
window.testElectroFinal = function() {
  console.log("=== FINAL ELEKTRO STACK INTEGRATION TEST ===");

  // Clear any existing errors
  console.clear();

  // Test 1: Check if all functions exist
  const requiredFunctions = [
    '_executeElectroEffect',
    '_showElectroAnimation',
    '_showElectroCompleteMessage',
    '_showScoreAnimations',
    '_showMultiplierAnimation',
    '_showPointsAnimation'
  ];

  console.log("🔍 Checking required functions...");
  let allFunctionsExist = true;

  requiredFunctions.forEach(funcName => {
    if (typeof window[funcName] === 'function' || funcName in window) {
      console.log(`✅ ${funcName} - Available`);
    } else {
      console.log(`❌ ${funcName} - Missing`);
      allFunctionsExist = false;
    }
  });

  if (!allFunctionsExist) {
    console.log("❌ Some required functions are missing!");
    return;
  }

  // Test 2: Force elektro piece and test placement
  console.log("\n🧪 Testing Elektro piece generation...");
  forceElectroPiece();

  // Test 3: Run the comprehensive test
  console.log("\n🧪 Running comprehensive elektro test...");
  setTimeout(() => {
    testElectroComplete();
  }, 1000);

  console.log("✅ All tests initiated! Check console for results.");
};

console.log("🚀 NEW: testElectroFinal() - Complete integration test");
