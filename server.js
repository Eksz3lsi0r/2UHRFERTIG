const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

// Port für Render.com (nutzt Umgebungsvariable) oder lokal 8080
const PORT = process.env.PORT || 8080;

// HTTP Server für statische Dateien
const server = http.createServer((req, res) => {
  // Setze CORS-Header für lokale Entwicklung
  res.setHeader("Access-Control-Allow-Origin", "*");

  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./index.html";
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  const contentType = mimeTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 - Datei nicht gefunden</h1>", "utf-8");
      } else {
        res.writeHead(500);
        res.end("Server-Fehler: " + error.code, "utf-8");
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

// WebSocket Server an HTTP Server anhängen
const wss = new WebSocket.Server({ server });

// Spieler- und Matchmaking-Verwaltung
let waitingPlayer = null;
const activeGames = new Map();

// Server starten
server.listen(PORT, () => {
  console.log(`🏓 Server läuft auf Port ${PORT}`);
  console.log(`📡 HTTP: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

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
