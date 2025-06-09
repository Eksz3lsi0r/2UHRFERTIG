/* --------------------------------------------------------------------
 *  src/network.js   –   Kommunikation mit dem Server (PvP)
 * ------------------------------------------------------------------ */
import { LANG } from "./constants.js";
import { player } from "./player.js";
import { state } from "./state.js";
import { ui } from "./ui.js";

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

/* ---------- Socket initialisieren ----------------------------------- */
// Wir nutzen die globale io-Variable aus dem HTML-Script-Tag
export const socket = window.io
  ? window.io({ autoConnect: false })
  : { on: () => {}, emit: () => {}, connect: () => {} };

// Make socket globally available for chat functionality
window.socket = socket;

// Show waiting message when matchmaking and update overlay
socket.on("waiting", (data) => {
  ui.displayMessage(data.message, "info");
  // Update matchmaking status if overlay is visible
  const matchmakingOverlay = document.getElementById("matchmaking-overlay");
  if (matchmakingOverlay && !matchmakingOverlay.classList.contains("hidden")) {
    ui.updateMatchmakingStatus(data.playerCount || 1);
  }
});

/* --------------------------------------------------------------------
 *  Öffentliche Helferfunktionen
 * ------------------------------------------------------------------ */
export function findGame(playerName) {
  if (!socket.connected) socket.connect();
  socket.emit("findGame", {
    playerName,
    ranked: state.rankedPvP || false,
  });
}
export function sendBoard() {
  if (!socket.connected) {
    console.warn("Socket not connected, unable to send board");
    return;
  }

  // Send board update immediately for real-time synchronization
  socket.emit("boardUpdate", state.playerBoard);
  // Optional: Log only when debugging is needed
  // console.log("Board update sent (optimized)");
}

export function sendScore() {
  if (!socket.connected) {
    console.warn("Socket not connected, unable to send score");
    return;
  }

  // Send score update immediately for real-time synchronization
  socket.emit("scoreUpdate", state.playerScore);
  // Optional: Log only when debugging is needed
  // console.log("Score update sent (optimized):", state.playerScore);

  // In PVP catch-up: if opponent finished and player overtakes, immediately send gameOver
  if (
    state.currentMode === "player" &&
    state.opponentFinished &&
    state.playerScore > state.opponentFinalScore
  ) {
    socket.emit("gameOver", state.playerScore);
  }
}
export function requestRematch() {
  socket.emit("requestRematch");
}

export function cancelMatchmaking() {
  socket.emit("cancelMatchmaking");
  ui.hideMatchmakingOverlay();
}

// Export debounced functions for use by power-ups and other systems
export { debouncedBoardUpdate, debouncedScoreUpdate };

/* --------------------------------------------------------------------
 *  Events vom Server
 * ------------------------------------------------------------------ */
socket.on("connect", () => debugLog("[socket] verbunden:", socket.id));

socket.on("disconnect", (reason) => {
  console.warn("[socket] getrennt:", reason);

  // Stop real-time synchronization on disconnect
  stopRealTimeSynchronization();

  if (state.currentMode === "player" && state.gameActive) {
    player.finishGame(
      false,
      ui.translateUI && // deutsch / engl. Text
        (state.currentLanguage === "de"
          ? "Verbindung verloren. Zurück zum Hauptmenü."
          : "Connection lost. Returning to main menu.")
    );
  }
});

/* ---- Spiel‐Match gefunden ------------------------------------------ */
socket.on("playerInfo", (data) => {
  state.playerId = data.playerId;
  state.opponentId = data.opponentId;
  state.playerName = data.playerName;
  state.opponentName = data.opponentName;
  ui.translateUI();
});

/* ---- Start des Spiels ---------------------------------------------- */
socket.on("startGame", (data) => {
  if (state.currentMode !== "player") return;

  // Hide matchmaking overlay and show game area
  ui.hideMatchmakingOverlay();
  ui.showGameArea();

  // Reset PvP-Spiel komplett für Rematch/Neustart
  if (typeof window.player?.resetGame === "function") {
    window.player.resetGame();
  }
  if (state.el.oppScore) state.el.oppScore.textContent = "0";
  if (state.el.score) state.el.score.textContent = "0";
  state.opponentFinished = false;
  state.opponentFinalScore = 0;
  state.timeLeft = 0;

  // Ensure opponent board is properly reset for real-time updates
  if (state.opponentBoardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.opponentBoardCells[r] && state.opponentBoardCells[r][c]) {
          state.opponentBoardCells[r][c].className = "opponent-cell";
          state.opponentBoardCells[r][c].classList.remove("filled", "fill-warning", "fill-danger");
        }
      }
    }
  }

  // Initialize permanent multiplier displays for real-time visibility
  if (typeof ui.initializePermanentMultiplierDisplays === "function") {
    ui.initializePermanentMultiplierDisplays();
  }

  // Start real-time synchronization for opponent area updates
  startRealTimeSynchronization();

  // Nach Reset GridSnap neu initialisieren (wichtig für Touch)
  import("./drag.js").then(({ GridSnap }) => {
    if (state.el.board && state.boardCells?.length) {
      GridSnap.init(state.el.board, state.boardCells);
    }
  });

  // Initial board & score sync - delay slightly to ensure opponent board is ready
  setTimeout(() => {
    socket.emit("boardUpdate", state.playerBoard);
    socket.emit("scoreUpdate", state.playerScore);
  }, 100);
});

/* ---- Gegner schickt Board ------------------------------------------ */
socket.on("opponentBoardUpdate", (board) => {
  if (!state.opponentBoardCells?.length) {
    console.warn("Opponent board cells not ready, trying to rebuild...");
    // Try to rebuild board DOM if opponent cells aren't ready
    if (typeof window.ui?.buildBoardDOM === "function") {
      window.ui.buildBoardDOM();
    }
    return;
  }

  try {
    // Only log board changes, not every update
    const fillPercentage = calculateFillPercentage(board);

    // Update board cells immediately for real-time display
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.opponentBoardCells[r] && state.opponentBoardCells[r][c]) {
          const cell = state.opponentBoardCells[r][c];
          const isFilled = !!(board[r] && board[r][c]);

          // Remove all existing states first for clean updates
          cell.classList.remove("filled", "fill-warning", "fill-danger");

          // Update filled state immediately
          if (isFilled) {
            cell.classList.add("filled");
          }
        }
      }
    }

    // Apply fill percentage colors for real-time visual feedback
    applyFillColors(state.opponentBoardCells, fillPercentage);

    // Only log significant changes (every 5% or major milestones)
    if (fillPercentage >= 95 || fillPercentage % 10 === 0 || fillPercentage >= 60) {
      debugLog(`Opponent board updated. Fill: ${fillPercentage.toFixed(1)}%`);
    }
  } catch (err) {
    console.error("Error updating opponent board in real-time:", err);
  }
});

/* ---- Gegner schickt Punktestand ------------------------------------ */
socket.on("opponentScore", (score) => {
  if (state.el.oppScore) {
    const previousScore = parseInt(state.el.oppScore.textContent) || 0;
    state.el.oppScore.textContent = score;

    // Only log score changes, not identical updates
    if (previousScore !== score) {
      debugLog(`Opponent score updated: ${previousScore} -> ${score}`);
    }

    // Ensure score display is visible and properly formatted
    if (state.el.oppScore.parentElement) {
      state.el.oppScore.parentElement.style.display = "flex";
    }
  } else {
    console.warn("Opponent score element not found");
  }
});

/* ---- Gegner ist fertig --------------------------------------------- */
socket.on("opponentFinished", (data) => {
  state.opponentFinished = true;
  state.opponentFinalScore = data.score;
  state.timeLeft = 180; // in Sekunden

  // Zeige neuen dedizierten Timer im UI für beide Spieler
  ui.showCatchupTimer({
    playerName: data.playerName,
    score: data.score,
    isFirstFinisher: state.playerId === data.playerId,
    secondsLeft: state.timeLeft,
  });

  // Countdown starten
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.countdownInterval = setInterval(() => {
    state.timeLeft -= 1;
    ui.updateCatchupTimer(state.timeLeft); // Aktualisiere den Timer für beide Spieler
    debugLog("Timer: ", state.timeLeft);
    if (state.timeLeft <= 0) {
      clearInterval(state.countdownInterval);
      ui.hideCatchupTimer(); // Verstecke den Timer, wenn die Zeit abgelaufen ist
      // Warten auf Server-Ende via gameEnd
    }
  }, 1000);
});

/* ---- Endstand kommt vom Server ------------------------------------- */
socket.on("gameEnd", (data) => {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.gameActive = false;
  const catchupTimer = document.getElementById("catchup-timer");
  if (catchupTimer) catchupTimer.style.display = "none";

  // Stop real-time synchronization when game ends
  stopRealTimeSynchronization();

  // Check if this is a ranked game
  if (data.isRanked && data.rankingChange) {
    // Show ranked game summary overlay
    ui.showRankedGameSummaryOverlay({
      win: data.win,
      yourScore: data.yourScore,
      opponentScore: data.opponentScore,
      opponentName: data.opponentName || state.opponentName,
      rankingChange: data.rankingChange,
      timeRemaining: data.timeRemaining || 0,
    });
  } else {
    // Show normal game result overlay
    const msg = data.win
      ? LANG[state.currentLanguage].gameWin(
          data.opponentName || state.opponentName,
          data.yourScore,
          data.opponentScore
        )
      : LANG[state.currentLanguage].gameLose(
          data.opponentName || state.opponentName,
          data.yourScore,
          data.opponentScore
        );

    player.finishGame(data.win, msg);
  }
});

/* ---- Gegner bricht ab ---------------------------------------------- */
socket.on("opponentLeft", (data) => {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.gameActive = false;

  // Stop real-time synchronization when opponent leaves
  stopRealTimeSynchronization();

  player.finishGame(
    false,
    LANG[state.currentLanguage].opponentLeftMsg(
      data.opponentName || state.opponentName
    )
  );
});

/* ---- Rematch-Workflow ---------------------------------------------- */
socket.on("rematchRequestedByOpponent", (data) => {
  ui.displayMessage?.(
    LANG[state.currentLanguage].rematchRequestedMsg(
      data.playerName || state.opponentName
    ),
    "info"
  );
});
socket.on("waitingForRematchConfirm", () => {
  ui.displayMessage?.(
    LANG[state.currentLanguage].waitingForRematchConfirmMsg,
    "info"
  );
});

/* ---- Matchmaking Events -------------------------------------------- */
socket.on("matchmakingUpdate", (data) => {
  // Update player count in matchmaking overlay
  if (data.playerCount !== undefined) {
    ui.updateMatchmakingStatus(data.playerCount);
  }
});

socket.on("matchmakingError", (data) => {
  ui.hideMatchmakingOverlay();
  ui.displayMessage(data.message || "Matchmaking failed", "error");
});

socket.on("matchmakingCancelled", () => {
  ui.hideMatchmakingOverlay();
  ui.displayMessage(
    LANG[state.currentLanguage].matchmakingCancelledMsg || "Matchmaking cancelled",
    "info"
  );
});

// --- Chat Message Handling (PvP) ---
window.sendChatMessage = function (msg) {
  debugLog("[Chat] sendChatMessage –", `"${msg}"`);
  debugLog("[Chat] Current mode:", state.currentMode);
  debugLog("[Chat] Socket exists:", !!window.socket);
  debugLog("[Chat] Socket emit function:", typeof window.socket?.emit);
  debugLog(
    "[Chat] appendChatMessage function:",
    typeof window.appendChatMessage
  );

  if (state.currentMode !== "player") {
    console.warn("[Chat] Not in player mode, cannot send message");
    return;
  }

  if (!window.socket) {
    console.warn("[Chat] No socket connection available");
    return;
  }

  if (typeof window.socket.emit !== "function") {
    console.warn("[Chat] Socket emit is not a function");
    return;
  }

  try {
    window.socket.emit("chatMessage", { msg });
    debugLog("[Chat] Message sent to server successfully");

    // Don't add the message locally here - wait for server confirmation
    // This prevents duplicate messages
    debugLog("[Chat] Message sent, waiting for server confirmation");
  } catch (error) {
    console.error("[Chat] Error sending message:", error);
  }
};

if (window.socket && typeof window.socket.on === "function") {
  window.socket.on("chatMessage", (data) => {
    debugLog("[Chat] received chatMessage", data);
    debugLog(
      "[Chat] appendChatMessage function available:",
      typeof window.appendChatMessage
    );

    if (typeof window.appendChatMessage === "function") {
      // Handle both sent and received messages
      if (data.fromSelf) {
        // Message sent by this client
        const message = "Du: " + data.msg;
        window.appendChatMessage(message, true);
      } else {
        // Message received from opponent
        const displayName = state.opponentName || "Gegner";
        const message = displayName + ": " + data.msg;
        window.appendChatMessage(message, false);
      }
      debugLog("[Chat] Message added to chat");
    } else {
      console.warn(
        "[Chat] appendChatMessage function not available for received message"
      );
    }
  });
}

/* --------------------------------------------------------------------
 *  Helper function to calculate board fill percentage
 * ------------------------------------------------------------------ */
function calculateFillPercentage(board) {
  let filledCells = 0;
  const totalCells = 100; // 10x10 grid

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (board[r] && board[r][c]) {
        filledCells++;
      }
    }
  }

  return (filledCells / totalCells) * 100;
}

/* --------------------------------------------------------------------
 *  Apply color based on fill percentage
 * ------------------------------------------------------------------ */
function applyFillColors(cells, fillPercentage) {
  if (!cells || !cells.length) return;

  // Only log significant color changes
  let colorChangeCount = 0;

  // Apply colors only to filled cells
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (cells[r] && cells[r][c]) {
        const cell = cells[r][c];

        // Remove existing fill classes
        cell.classList.remove("fill-warning", "fill-danger");

        // Apply new color class based on number of filled cells
        // ONLY if the cell is filled (has the "filled" class)
        if (cell.classList.contains("filled")) {
          if (fillPercentage >= 60) {
            cell.classList.add("fill-danger"); // Red at 60+ cells
            colorChangeCount++;
          } else if (fillPercentage >= 30) {
            cell.classList.add("fill-warning"); // Yellow at 30+ cells
            colorChangeCount++;
          }
        }
      }
    }
  }

  // Only log when colors are applied to significant number of cells
  if (colorChangeCount > 0 && fillPercentage >= 30) {
    debugLog(`Fill colors applied: ${colorChangeCount} cells colored at ${fillPercentage.toFixed(1)}% fill`);
  }
}

/* --------------------------------------------------------------------
 *  Ensure opponent board sync function
 * ------------------------------------------------------------------ */
export function ensureOpponentBoardSync() {
  debugLog("Ensuring opponent board sync...");
  if (state.currentMode === "player" && socket.connected) {
    // Request current board state from opponent
    socket.emit("requestBoardSync");
  }
}

/* --------------------------------------------------------------------
 *  Real-time synchronization interval for ensuring updates
 * ------------------------------------------------------------------ */
let syncInterval = null;
let lastSentBoard = null;
let lastSentScore = null;
let boardUpdateTimeout = null;
let scoreUpdateTimeout = null;

// Debounced update functions to prevent excessive network calls
function debouncedBoardUpdate() {
  if (boardUpdateTimeout) {
    clearTimeout(boardUpdateTimeout);
  }

  boardUpdateTimeout = setTimeout(() => {
    sendBoard();
    boardUpdateTimeout = null;
  }, 100); // 100ms debounce
}

function debouncedScoreUpdate() {
  if (scoreUpdateTimeout) {
    clearTimeout(scoreUpdateTimeout);
  }

  scoreUpdateTimeout = setTimeout(() => {
    sendScore();
    scoreUpdateTimeout = null;
  }, 100); // 100ms debounce
}

export function startRealTimeSynchronization() {
  debugLog("Starting real-time synchronization for opponent area");

  // Clear any existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Reset tracking variables when starting new sync
  lastSentBoard = null;
  lastSentScore = null;

  // Set up periodic sync check every 500ms for real-time feeling
  syncInterval = setInterval(() => {
    if (state.currentMode === "player" && socket.connected) {
      // Only send updates if data has actually changed
      checkAndSendBoardUpdate();
      checkAndSendScoreUpdate();
    }
  }, 500);
}

export function stopRealTimeSynchronization() {
  debugLog("Stopping real-time synchronization");
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  // Clear any pending debounced updates
  if (boardUpdateTimeout) {
    clearTimeout(boardUpdateTimeout);
    boardUpdateTimeout = null;
  }

  if (scoreUpdateTimeout) {
    clearTimeout(scoreUpdateTimeout);
    scoreUpdateTimeout = null;
  }

  // Clear tracking variables when stopping sync
  lastSentBoard = null;
  lastSentScore = null;
}

/* --------------------------------------------------------------------
 *  Smart change detection functions
 * ------------------------------------------------------------------ */
function checkAndSendBoardUpdate() {
  const currentBoardString = JSON.stringify(state.playerBoard);

  if (lastSentBoard !== currentBoardString) {
    lastSentBoard = currentBoardString;
    sendBoard();
  }
}

function checkAndSendScoreUpdate() {
  const currentScore = state.playerScore;

  if (lastSentScore !== currentScore) {
    lastSentScore = currentScore;
    sendScore();
  }
}
