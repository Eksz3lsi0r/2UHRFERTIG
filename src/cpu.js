/* --------------------------------------------------------------------
 *  src/cpu.js  –  KI-Logik für Einzelspieler-Modus
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
};

/* --------------------------------------------------------------------
 *  Interne Variablen    (NUR hier benutzt)
 * ------------------------------------------------------------------ */
let turnTimeout = null;

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
  const best = _findFirstLegalMove();
  if (best) {
    _placeShape(best.shape, best.r, best.c);
    state.cpuPieces.splice(best.index, 1);
    _clearLines();
    updateScore();
    renderCpuBoard();
    if (state.cpuGameActive)
      turnTimeout = setTimeout(takeTurn, 700 + Math.random() * 800);
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

/* ---------- Move-Suche --------------------------------------------- */
function _findFirstLegalMove() {
  for (let i = 0; i < state.cpuPieces.length; i++) {
    const sh = state.cpuPieces[i];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (_canPlace(sh, r, c)) return { shape: sh, r, c, index: i };
  }
  return null;
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
