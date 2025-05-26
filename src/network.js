/* --------------------------------------------------------------------
 *  src/network.js   –   Kommunikation mit dem Server (PvP)
 * ------------------------------------------------------------------ */
import { state } from "./state.js";
import { ui } from "./ui.js";
import { player } from "./player.js";
import { LANG } from "./constants.js";

/* ---------- Socket initialisieren ----------------------------------- */
// Wir nutzen die globale io-Variable aus dem HTML-Script-Tag
export const socket = window.io
  ? window.io({ autoConnect: false })
  : { on: () => {}, emit: () => {}, connect: () => {} };

// Make socket globally available for chat functionality
window.socket = socket;

// Show waiting message when matchmaking
socket.on("waiting", (data) => {
  ui.displayMessage(data.message, "info");
});

/* --------------------------------------------------------------------
 *  Öffentliche Helferfunktionen
 * ------------------------------------------------------------------ */
export function findGame(playerName) {
  if (!socket.connected) socket.connect();
  socket.emit("findGame", { playerName });
}
export function sendBoard() {
  socket.emit("boardUpdate", state.playerBoard);
}
export function sendScore() {
  socket.emit("scoreUpdate", state.playerScore);
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

/* --------------------------------------------------------------------
 *  Events vom Server
 * ------------------------------------------------------------------ */
socket.on("connect", () => console.log("[socket] verbunden:", socket.id));

socket.on("disconnect", (reason) => {
  console.warn("[socket] getrennt:", reason);
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
  // Reset PvP-Spiel komplett für Rematch/Neustart
  if (typeof window.player?.resetGame === "function") {
    window.player.resetGame();
  }
  if (state.el.oppScore) state.el.oppScore.textContent = "0";
  if (state.el.score) state.el.score.textContent = "0";
  state.opponentFinished = false;
  state.opponentFinalScore = 0;
  state.timeLeft = 0;
  // Nach Reset GridSnap neu initialisieren (wichtig für Touch)
  import("./drag.js").then(({ GridSnap }) => {
    if (state.el.board && state.boardCells?.length) {
      GridSnap.init(state.el.board, state.boardCells);
    }
  });
  // Initial board & score sync
  socket.emit("boardUpdate", state.playerBoard);
  socket.emit("scoreUpdate", state.playerScore);
});

/* ---- Gegner schickt Board ------------------------------------------ */
socket.on("opponentBoardUpdate", (board) => {
  if (!state.opponentBoardCells?.length) return;
  try {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (state.opponentBoardCells[r] && state.opponentBoardCells[r][c]) {
          state.opponentBoardCells[r][c].classList.toggle(
            "filled",
            !!board[r][c]
          );
        }
      }
    }
  } catch (err) {
    console.error("Fehler beim Aktualisieren des Gegner-Boards:", err);
  }
});

/* ---- Gegner schickt Punktestand ------------------------------------ */
socket.on("opponentScore", (score) => {
  state.el.oppScore.textContent = score;
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
    console.log("Timer: ", state.timeLeft);
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
});

/* ---- Gegner bricht ab ---------------------------------------------- */
socket.on("opponentLeft", (data) => {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.gameActive = false;
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

// --- Chat Message Handling (PvP) ---
window.sendChatMessage = function (msg) {
  console.log("[Chat] sendChatMessage –", `"${msg}"`);
  console.log("[Chat] Current mode:", state.currentMode);
  console.log("[Chat] Socket exists:", !!window.socket);
  console.log("[Chat] Socket emit function:", typeof window.socket?.emit);
  console.log(
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
    console.log("[Chat] Message sent to server successfully");

    if (typeof window.appendChatMessage === "function") {
      window.appendChatMessage("Du: " + msg, true);
      console.log("[Chat] Message added to local chat");
    } else {
      console.warn("[Chat] appendChatMessage function not available");
    }
  } catch (error) {
    console.error("[Chat] Error sending message:", error);
  }
};

if (window.socket && typeof window.socket.on === "function") {
  window.socket.on("chatMessage", (data) => {
    console.log("[Chat] received chatMessage", data);
    console.log(
      "[Chat] appendChatMessage function available:",
      typeof window.appendChatMessage
    );

    if (typeof window.appendChatMessage === "function") {
      const displayName = data.fromSelf ? "Du" : state.opponentName || "Gegner";
      const message = displayName + ": " + data.msg;
      window.appendChatMessage(message, data.fromSelf);
      console.log("[Chat] Message added to chat:", message);
    } else {
      console.warn(
        "[Chat] appendChatMessage function not available for received message"
      );
    }
  });
}
