/* --------------------------------------------------------------------
 *  src/cpu.js  –  KI-Logik für Einzelspieler-Modus mit Schwierigkeitsgraden
 * ------------------------------------------------------------------ */
import { state } from "./state.js";
import { ALL_POSSIBLE_SHAPES } from "./constants.js";
import { clearSound } from "./audio.js"; // optional, falls Sound
import { player } from "./player.js"; // für playerHasMoves()

/* --------------------------------------------------------------------
 *  Öffentliche API
 * ------------------------------------------------------------------ */
export const cpu = {
  initGame,
  takeTurn,
  hasMoves: () => hasMoves(),
  setDifficulty,
};

/* --------------------------------------------------------------------
 *  Interne Variablen    (NUR hier benutzt)
 * ------------------------------------------------------------------ */
let turnTimeout = null;

/* --------------------------------------------------------------------
 *  Schwierigkeitsgrad setzen
 * ------------------------------------------------------------------ */
function setDifficulty(difficulty) {
  state.cpuDifficulty = difficulty;
}

/* --------------------------------------------------------------------
 *  Start-Funktion  (wird von main.js aufgerufen)
 * ------------------------------------------------------------------ */
function initGame() {
  state.cpuBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.cpuScore = 0;
  state.cpuPieces = [];
  state.cpuGameActive = true;

  renderCpuBoard(); // zeigt leeres Board
  updateScore(); // setzt 0
  _generatePieces(); // erste 3 Teile
}

/* --------------------------------------------------------------------
 *  Haupt-Zugroutine  (rekursiv via setTimeout)
 * ------------------------------------------------------------------ */
function takeTurn() {
  if (!state.cpuGameActive) return;

  /* Nachschub besorgen */
  if (state.cpuPieces.length === 0) _generatePieces();
  if (!hasMoves()) {
    _noMovesLeft(); // gewinnt oder verliert
    return;
  }

  /* Best-Move suchen */
  const best = _findBestMove();
  if (best) {
    _placeShape(best.shape, best.r, best.c);
    state.cpuPieces.splice(best.index, 1);
    _clearLines();
    updateScore();
    renderCpuBoard();
    if (state.cpuGameActive) {
      const delay = _getThinkingDelay();
      turnTimeout = setTimeout(takeTurn, delay);
    }
  } else {
    _noMovesLeft(); // failsafe
  }
}

/* --------------------------------------------------------------------
 *  Hilfsfunktionen
 * ------------------------------------------------------------------ */
function hasMoves() {
  for (const sh of state.cpuPieces)
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) if (_canPlace(sh, r, c)) return true;
  return false;
}

/* ---------- Move-Suche nach Schwierigkeitsgrad ------------------------ */
function _findBestMove() {
  switch (state.cpuDifficulty) {
    case "easy":
      return _findEasyMove();
    case "medium":
      return _findMediumMove();
    case "hard":
      return _findHardMove();
    default:
      return _findEasyMove();
  }
}

/* ---------- Einfache KI: Erster legaler Zug ------------------------- */
function _findEasyMove() {
  for (let i = 0; i < state.cpuPieces.length; i++) {
    const sh = state.cpuPieces[i];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (_canPlace(sh, r, c)) return { shape: sh, r, c, index: i };
  }
  return null;
}

/* ---------- Mittlere KI: Strategische Entscheidungen --------------- */
function _findMediumMove() {
  let bestMove = null;
  let bestScore = -1;

  for (let i = 0; i < state.cpuPieces.length; i++) {
    const sh = state.cpuPieces[i];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (_canPlace(sh, r, c)) {
          const score = _evaluateMediumMove(sh, r, c);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { shape: sh, r, c, index: i };
          }
        }
      }
    }
  }
  return bestMove;
}

/* ---------- Schwere KI: Erweiterte Strategien ---------------------- */
function _findHardMove() {
  let bestMove = null;
  let bestScore = -1;

  for (let i = 0; i < state.cpuPieces.length; i++) {
    const sh = state.cpuPieces[i];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (_canPlace(sh, r, c)) {
          const score = _evaluateHardMove(sh, r, c, i);
          if (score > bestScore) {
            bestScore = score;
            bestMove = { shape: sh, r, c, index: i };
          }
        }
      }
    }
  }
  return bestMove;
}

/* ---------- Move-Bewertung für mittlere KI ------------------------- */
function _evaluateMediumMove(shape, br, bc) {
  let score = 0;

  // Simuliere das Platzieren
  const tempBoard = state.cpuBoard.map((row) => [...row]);
  shape.forEach(([r, c]) => {
    tempBoard[br + r][bc + c] = 1;
  });

  // Punkte für räumbare Zeilen/Spalten
  const { fullRows, fullCols } = _checkClearableLines(tempBoard);
  score += (fullRows.length + fullCols.length) * 50;

  // Bonus für Kombos (Zeile + Spalte gleichzeitig)
  if (fullRows.length > 0 && fullCols.length > 0) {
    score += 100;
  }

  // Punkte für Ecken und Ränder (kompakte Platzierung)
  score += _getPositionBonus(br, bc);

  // Punkte für Größe des Shapes
  score += shape.length * 5;

  // Malus für isolierte Bereiche
  score -= _countIsolatedSpaces(tempBoard) * 10;

  return score;
}

/* ---------- Move-Bewertung für schwere KI -------------------------- */
function _evaluateHardMove(shape, br, bc, pieceIndex) {
  let score = _evaluateMediumMove(shape, br, bc);

  // Zusätzliche Strategien für schwere KI:

  // 1. Vorausschau: Wie viele Züge bleiben nach diesem Zug?
  const tempBoard = state.cpuBoard.map((row) => [...row]);
  shape.forEach(([r, c]) => {
    tempBoard[br + r][bc + c] = 1;
  });

  const remainingPieces = [...state.cpuPieces];
  remainingPieces.splice(pieceIndex, 1);
  const futureMoves = _countPossibleMoves(tempBoard, remainingPieces);
  score += futureMoves * 15;

  // 2. Effizienz: Große Pieces zuerst, wenn sie gut platziert werden können
  if (shape.length >= 4) {
    score += 20;
  }

  // 3. Zentrale Bereiche vermeiden, wenn das Board schon voll ist
  const fillPercentage = _getBoardFillPercentage(tempBoard);
  if (fillPercentage > 50) {
    const centerBonus = _getCenterAvoidanceBonus(br, bc);
    score += centerBonus;
  }

  // 4. Defensive Spielweise: Nicht zu viele Löcher hinterlassen
  score -= _countHoles(tempBoard) * 5;

  return score;
}

/* ---------- Hilfsfunktionen für KI-Bewertung ----------------------- */
function _checkClearableLines(board) {
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < 10; r++) {
    if (board[r].every((v) => v === 1)) fullRows.push(r);
  }

  for (let c = 0; c < 10; c++) {
    let full = true;
    for (let r = 0; r < 10; r++) {
      if (board[r][c] !== 1) {
        full = false;
        break;
      }
    }
    if (full) fullCols.push(c);
  }

  return { fullRows, fullCols };
}

function _getPositionBonus(r, c) {
  // Bonus für Ecken und Ränder
  let bonus = 0;

  // Ecken
  if ((r === 0 || r === 9) && (c === 0 || c === 9)) {
    bonus += 15;
  }
  // Ränder
  else if (r === 0 || r === 9 || c === 0 || c === 9) {
    bonus += 10;
  }

  return bonus;
}

function _countIsolatedSpaces(board) {
  let isolated = 0;
  for (let r = 1; r < 9; r++) {
    for (let c = 1; c < 9; c++) {
      if (board[r][c] === 0) {
        // Prüfe ob von gefüllten Zellen umgeben
        const neighbors = [
          board[r - 1][c],
          board[r + 1][c],
          board[r][c - 1],
          board[r][c + 1],
        ];
        if (neighbors.filter((n) => n === 1).length >= 3) {
          isolated++;
        }
      }
    }
  }
  return isolated;
}

function _countPossibleMoves(board, pieces) {
  let count = 0;
  for (const piece of pieces) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (_canPlaceOnBoard(board, piece, r, c)) {
          count++;
        }
      }
    }
  }
  return count;
}

function _getBoardFillPercentage(board) {
  let filled = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r][c] === 1) filled++;
    }
  }
  return (filled / 100) * 100;
}

function _getCenterAvoidanceBonus(r, c) {
  // Je weiter vom Zentrum entfernt, desto besser
  const centerR = 4.5;
  const centerC = 4.5;
  const distance = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
  return Math.floor(distance * 5);
}

function _countHoles(board) {
  let holes = 0;
  for (let r = 1; r < 9; r++) {
    for (let c = 1; c < 9; c++) {
      if (board[r][c] === 0) {
        // Ein Loch ist eine leere Stelle, die schwer zu füllen ist
        const surroundingFilled = [
          board[r - 1][c - 1],
          board[r - 1][c],
          board[r - 1][c + 1],
          board[r][c - 1],
          board[r][c + 1],
          board[r + 1][c - 1],
          board[r + 1][c],
          board[r + 1][c + 1],
        ].filter((cell) => cell === 1).length;

        if (surroundingFilled >= 6) {
          holes++;
        }
      }
    }
  }
  return holes;
}

function _canPlaceOnBoard(board, shape, br, bc) {
  return shape.every(([r, c]) => {
    const row = br + r,
      col = bc + c;
    return (
      row >= 0 && row < 10 && col >= 0 && col < 10 && board[row][col] === 0
    );
  });
}

/* ---------- Denkzeit je nach Schwierigkeitsgrad ------------------- */
function _getThinkingDelay() {
  switch (state.cpuDifficulty) {
    case "easy":
      return 500 + Math.random() * 500; // 0.5-1s
    case "medium":
      return 800 + Math.random() * 700; // 0.8-1.5s
    case "hard":
      return 1200 + Math.random() * 1000; // 1.2-2.2s
    default:
      return 700 + Math.random() * 800;
  }
}

/* ---------- Legacy: Alter einfacher Algorithmus ------------------- */
function _findFirstLegalMove() {
  return _findEasyMove();
}

/* ---------- Platzieren ---------------------------------------------- */
function _placeShape(shape, br, bc) {
  shape.forEach(([r, c]) => {
    const row = br + r,
      col = bc + c;
    state.cpuBoard[row][col] = 1;
  });
  state.cpuScore += shape.length;
}

/* ---------- Zeilen/Spalten leeren ----------------------------------- */
function _clearLines() {
  const fullRows = [],
    fullCols = [];
  for (let r = 0; r < 10; r++)
    if (state.cpuBoard[r].every((v) => v === 1)) fullRows.push(r);
  for (let c = 0; c < 10; c++) {
    let full = true;
    for (let r = 0; r < 10; r++)
      if (state.cpuBoard[r][c] !== 1) {
        full = false;
        break;
      }
    if (full) fullCols.push(c);
  }
  if (fullRows.length === 0 && fullCols.length === 0) return;
  clearSound.play?.(); // optional Klang

  fullRows.forEach((r) => state.cpuBoard[r].fill(0));
  fullCols.forEach((c) => {
    for (let r = 0; r < 10; r++) state.cpuBoard[r][c] = 0;
  });

  let bonus = fullRows.length + fullCols.length;
  if (fullRows.length && fullCols.length)
    bonus += fullRows.length * fullCols.length;
  state.cpuScore += bonus * 10;
}

/* ---------- Shapes erzeugen ---------------------------------------- */
function _generatePieces() {
  const pool = ALL_POSSIBLE_SHAPES;
  let tries = 0;
  while (tries++ < 50) {
    const batch = Array.from({ length: 3 }, () =>
      pool[Math.floor(Math.random() * pool.length)].map((c) => [...c])
    );
    if (batch.every((sh) => _pieceFitsSomewhere(sh))) {
      state.cpuPieces = batch;
      return;
    }
  }
  /* Wenn nichts passt → keine Züge */
  state.cpuPieces = [];
}

function _pieceFitsSomewhere(sh) {
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++) if (_canPlace(sh, r, c)) return true;
  return false;
}

/* ---------- Legalitätsprüfung -------------------------------------- */
function _canPlace(shape, br, bc) {
  return shape.every(([r, c]) => {
    const row = br + r,
      col = bc + c;
    return (
      row >= 0 &&
      row < 10 &&
      col >= 0 &&
      col < 10 &&
      state.cpuBoard[row][col] === 0
    );
  });
}

/* ---------- Board-Rendering (zeigt CPU-Board im UI) ---------------- */
function renderCpuBoard() {
  if (!state.opponentBoardCells?.length) return;

  // Calculate fill percentage for color coding
  let filledCells = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (state.cpuBoard[r][c]) {
        filledCells++;
      }
    }
  }

  const fillPercentage = (filledCells / 100) * 100;
  console.log(
    `CPU Board fill percentage: ${fillPercentage}% (${filledCells} filled cells)`
  );

  // Update cells with fill state and color coding
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = state.opponentBoardCells[r][c];
      if (!cell) continue;

      const isFilled = !!state.cpuBoard[r][c];
      cell.classList.toggle("filled", isFilled);

      // Remove existing fill color classes
      cell.classList.remove("fill-warning", "fill-danger");

      // Apply fill percentage colors ONLY to filled cells
      if (isFilled) {
        if (fillPercentage >= 60) {
          cell.classList.add("fill-danger"); // Red at 60+ cells
          console.log(`Applied fill-danger to CPU cell [${r},${c}]`);
        } else if (fillPercentage >= 30) {
          cell.classList.add("fill-warning"); // Yellow at 30+ cells
          console.log(`Applied fill-warning to CPU cell [${r},${c}]`);
        }
      }
    }
  }
}

/* ---------- Punkteanzeige ------------------------------------------ */
function updateScore() {
  state.el.oppScore.textContent = state.cpuScore;
}

/* ---------- Keine Züge mehr ---------------------------------------- */
function _noMovesLeft() {
  // CPU hat keine Züge mehr: nur das Flag setzen, Spieler kann weiterspielen
  state.cpuGameActive = false;
}
