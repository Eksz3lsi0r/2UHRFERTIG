const WebSocket = require("ws");

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// Spieler- und Matchmaking-Verwaltung
let waitingPlayer = null;
const activeGames = new Map();

console.log(`🏓 WebSocket Server läuft auf Port ${PORT}`);

wss.on("connection", (ws) => {
  console.log("🔌 Neuer Spieler verbunden");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "find_match":
          handleFindMatch(ws);
          break;

        case "paddle_update":
          handlePaddleUpdate(ws, data);
          break;

        case "ball_update":
          handleBallUpdate(ws, data);
          break;

        case "score_update":
          handleScoreUpdate(ws, data);
          break;

        case "leave_game":
          handleLeaveGame(ws);
          break;
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten der Nachricht:", error);
    }
  });

  ws.on("close", () => {
    console.log("❌ Spieler getrennt");
    handleDisconnect(ws);
  });
});

function handleFindMatch(ws) {
  console.log("🔍 Spieler sucht nach Match");

  if (waitingPlayer === null) {
    // Erster Spieler wartet
    waitingPlayer = ws;
    ws.playerNumber = 1;
    ws.send(JSON.stringify({ type: "waiting" }));
  } else {
    // Match gefunden!
    const player1 = waitingPlayer;
    const player2 = ws;
    player2.playerNumber = 2;

    // Spiel-ID generieren
    const gameId = Date.now().toString();
    player1.gameId = gameId;
    player2.gameId = gameId;

    // Spiel speichern
    activeGames.set(gameId, { player1, player2 });

    // Beide Spieler benachrichtigen
    player1.send(
      JSON.stringify({
        type: "match_found",
        playerNumber: 1,
        gameId: gameId,
      }),
    );

    player2.send(
      JSON.stringify({
        type: "match_found",
        playerNumber: 2,
        gameId: gameId,
      }),
    );

    console.log(`✅ Match gefunden! Spiel-ID: ${gameId}`);
    waitingPlayer = null;
  }
}

function handlePaddleUpdate(ws, data) {
  const game = activeGames.get(ws.gameId);
  if (!game) return;

  const opponent = ws === game.player1 ? game.player2 : game.player1;

  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(
      JSON.stringify({
        type: "opponent_paddle",
        position: data.position,
        playerNumber: ws.playerNumber,
      }),
    );
  }
}

function handleBallUpdate(ws, data) {
  const game = activeGames.get(ws.gameId);
  if (!game) return;

  const opponent = ws === game.player1 ? game.player2 : game.player1;

  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(
      JSON.stringify({
        type: "ball_sync",
        position: data.position,
        velocity: data.velocity,
      }),
    );
  }
}

function handleScoreUpdate(ws, data) {
  const game = activeGames.get(ws.gameId);
  if (!game) return;

  const opponent = ws === game.player1 ? game.player2 : game.player1;

  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(
      JSON.stringify({
        type: "score_sync",
        score1: data.score1,
        score2: data.score2,
      }),
    );
  }
}

function handleLeaveGame(ws) {
  const game = activeGames.get(ws.gameId);
  if (!game) return;

  const opponent = ws === game.player1 ? game.player2 : game.player1;

  if (opponent && opponent.readyState === WebSocket.OPEN) {
    opponent.send(
      JSON.stringify({
        type: "opponent_left",
      }),
    );
  }

  activeGames.delete(ws.gameId);
  console.log(`🚪 Spieler hat Spiel ${ws.gameId} verlassen`);
}

function handleDisconnect(ws) {
  // Wenn Spieler wartet
  if (waitingPlayer === ws) {
    waitingPlayer = null;
    return;
  }

  // Wenn Spieler in aktivem Spiel
  handleLeaveGame(ws);
}
