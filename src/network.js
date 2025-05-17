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
  // Notify game started with correct names
  ui.displayMessage(
    LANG[state.currentLanguage].gameStarted(
      state.playerName,
      state.opponentName
    ),
    "info"
  );
});

/* ---- Start des Spiels ---------------------------------------------- */
socket.on("startGame", (data) => {
  if (state.currentMode !== "player") return;
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
  // Gegner ist fertig: starte 3-Minuten-Catch-up-Timer
  state.opponentFinished = true;
  state.opponentFinalScore = data.score;
  state.timeLeft = 180; // in Sekunden
  // Zeige Nachricht mit Timer-Platzhalter
  if (ui.displayMessage) {
    ui.displayMessage(
      `${data.playerName || state.opponentName} hat das Spiel mit ${
        data.score
      } Punkten beendet. Du hast noch <span id=\"timer\">03:00</span> Minuten und Sekunden Zeit!`,
      "info"
    );
  }
  // Countdown starten
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.countdownInterval = setInterval(() => {
    state.timeLeft -= 1;
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      const m = String(Math.floor(state.timeLeft / 60)).padStart(2, "0");
      const s = String(state.timeLeft % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }
    if (state.timeLeft <= 0) {
      clearInterval(state.countdownInterval);
      // Warten auf Server-Ende via gameEnd
    }
  }, 1000);
});

/* ---- Endstand kommt vom Server ------------------------------------- */
socket.on("gameEnd", (data) => {
  if (state.countdownInterval) clearInterval(state.countdownInterval);
  state.gameActive = false;
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
