// Node-Server: Matchmaking-Logik, Punktezähler & 3-Min-Catch-up, Rematch
const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Liefere Root-HTML abhängig vom User-Agent für Mobilgeräte
app.get("/", (req, res, next) => {
  const ua = req.headers["user-agent"] || "";
  if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
    // Für mobile Clients: index.html aus 'public' liefern
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  next();
});

// statische Dateien für Desktop
app.use(express.static(path.join(__dirname, "public"))); // HTML, CSS, no-scroll.js, sounds-Symlink
app.use(express.static(path.join(__dirname, "upload"))); // (optional)
app.use("/sounds", express.static(path.join(__dirname, "sounds"))); // alias für WAVs
app.use("/src", express.static(path.join(__dirname, "src"))); //  ←  NEU

// Matchmaking / Spielzustand
let waitingPlayer = null;
let gameCount = 0;
const games = {}; // key: room, value: { players, playerNames, scores, boards, firstFinisher, firstScore, timeout, rematchRequested, isFinished }

function initializeGameData(
  room,
  player1Id,
  player2Id,
  player1Name,
  player2Name
) {
  const initialBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  games[room] = {
    players: [player1Id, player2Id],
    playerNames: { [player1Id]: player1Name, [player2Id]: player2Name },
    scores: { [player1Id]: 0, [player2Id]: 0 },
    boards: {
      [player1Id]: JSON.parse(JSON.stringify(initialBoard)),
      [player2Id]: JSON.parse(JSON.stringify(initialBoard)),
    },
    firstFinisher: null,
    firstScore: 0,
    timeout: null,
    rematchRequested: { [player1Id]: false, [player2Id]: false },
    isFinished: false,
    finishedPlayers: [], // Track who sent gameOver
  };
}

io.on("connection", async (socket) => {
  console.log("Neuer Spieler:", socket.id);

  socket.on("findGame", (data) => {
    socket.playerName = data.playerName || "Anonymous";
    if (
      waitingPlayer &&
      waitingPlayer.connected &&
      waitingPlayer.id !== socket.id
    ) {
      const room = `game-${++gameCount}`;
      const player1 = waitingPlayer;
      const player2 = socket;

      Promise.all([player1.join(room), player2.join(room)])
        .then(() => {
          player1.gameRoom = room;
          player2.gameRoom = room;

          initializeGameData(
            room,
            player1.id,
            player2.id,
            player1.playerName,
            player2.playerName
          );

          io.to(room).emit("startGame", {
            room: room,
            players: {
              [player1.id]: { name: player1.playerName },
              [player2.id]: { name: player2.playerName },
            },
          });
          io.to(player1.id).emit("playerInfo", {
            playerId: player1.id,
            opponentId: player2.id,
            opponentName: player2.playerName,
            playerName: player1.playerName,
          });
          io.to(player2.id).emit("playerInfo", {
            playerId: player2.id,
            opponentId: player1.id,
            opponentName: player1.playerName,
            playerName: player2.playerName,
          });

          console.log(
            `Spiel ${room} gestartet mit ${player1.id} (${player1.playerName}) und ${player2.id} (${player2.playerName}).`
          );
          waitingPlayer = null;
        })
        .catch((err) => {
          console.error("Error joining room:", err);
          // Handle error, maybe try to clear waitingPlayer or notify users
        });
    } else {
      waitingPlayer = socket;
      socket.emit("waiting", { message: "Warte auf Gegner..." });
      console.log(`${socket.id} (${socket.playerName}) wartet.`);
    }
  });

  socket.on("boardUpdate", (boardData) => {
    const room = socket.gameRoom;
    if (!room || !games[room] || games[room].isFinished) return;
    const game = games[room];
    game.boards[socket.id] = boardData;
    const opponentId = game.players.find((id) => id !== socket.id);
    if (opponentId) {
      socket.to(opponentId).emit("opponentBoardUpdate", boardData);
    }
  });

  socket.on("scoreUpdate", (newScore) => {
    const room = socket.gameRoom;
    if (!room || !games[room] || games[room].isFinished) return;
    const game = games[room];
    if (game.scores[socket.id] !== newScore) {
      game.scores[socket.id] = newScore;
      const opponentId = game.players.find((id) => id !== socket.id);
      if (opponentId) {
        socket.to(opponentId).emit("opponentScore", newScore);
      }
      if (
        game.firstFinisher &&
        game.firstFinisher !== socket.id &&
        newScore > game.firstScore
      ) {
        finish(room, socket.id);
      }
    }
  });

  socket.on("gameOver", (finalScore) => {
    const room = socket.gameRoom;
    if (!room || !games[room] || games[room].isFinished) return;
    const game = games[room];

    if (game.finishedPlayers.includes(socket.id)) return;
    game.finishedPlayers.push(socket.id);
    game.scores[socket.id] = finalScore;
    console.log(
      `Spiel ${room}: ${socket.id} meldet gameOver mit Score ${finalScore}.`
    );

    if (!game.firstFinisher) {
      // First player finishes: start 3-min catch-up for opponent
      game.firstFinisher = socket.id;
      game.firstScore = finalScore;
      const opponentId = game.players.find((id) => id !== socket.id);
      // Sende an beide Spieler das Timer-Event
      [socket.id, opponentId].forEach((pid) => {
        if (pid && io.sockets.sockets.get(pid)) {
          io.to(pid).emit("opponentFinished", {
            playerName: game.playerNames[socket.id],
            score: finalScore,
            isFirstFinisher: pid === socket.id,
          });
        }
      });
      // Start 3-min timer
      if (game.timeout) clearTimeout(game.timeout);
      game.timeout = setTimeout(() => {
        // After 3 min, finish game with current scores
        const oppScore = game.scores[opponentId] || 0;
        const win = oppScore > finalScore ? opponentId : socket.id;
        finish(room, win);
      }, 180 * 1000);
    } else {
      // Second player finishes: decide winner immediately
      if (game.timeout) clearTimeout(game.timeout);
      const leader = game.firstFinisher;
      const leaderScore = game.firstScore;
      const challenger = socket.id;
      const challengerScore = finalScore;
      let win;
      if (challengerScore > leaderScore) {
        win = challenger;
      } else {
        win = leader;
      }
      finish(room, win);
    }
  });
  socket.on("requestRematch", () => {
    const room = socket.gameRoom;
    if (!room || !games[room]) return;

    socket.gameRoom = null; // Clear the game room reference before finding a new game

    // Handle like a new game request, exactly like findGame
    if (
      waitingPlayer &&
      waitingPlayer.connected &&
      waitingPlayer.id !== socket.id
    ) {
      const newRoom = `game-${++gameCount}`;
      const player1 = waitingPlayer;
      const player2 = socket;

      Promise.all([player1.join(newRoom), player2.join(newRoom)])
        .then(() => {
          player1.gameRoom = newRoom;
          player2.gameRoom = newRoom;

          initializeGameData(
            newRoom,
            player1.id,
            player2.id,
            player1.playerName,
            player2.playerName
          );

          io.to(newRoom).emit("startGame", {
            room: newRoom,
            players: {
              [player1.id]: { name: player1.playerName },
              [player2.id]: { name: player2.playerName },
            },
          });
          io.to(player1.id).emit("playerInfo", {
            playerId: player1.id,
            opponentId: player2.id,
            opponentName: player2.playerName,
            playerName: player1.playerName,
          });
          io.to(player2.id).emit("playerInfo", {
            playerId: player2.id,
            opponentId: player1.id,
            opponentName: player1.playerName,
            playerName: player2.playerName,
          });

          console.log(
            `Neues Spiel ${newRoom} gestartet mit ${player1.id} (${player1.playerName}) und ${player2.id} (${player2.playerName}).`
          );
          waitingPlayer = null;
        })
        .catch((err) => {
          console.error("Error joining room:", err);
        });
    } else {
      waitingPlayer = socket;
      socket.emit("waiting", { message: "Warte auf Gegner..." });
      console.log(`${socket.id} (${socket.playerName}) wartet.`);
    }
  });

  // --- Chat relay for PvP ---
  socket.on("chatMessage", (data) => {
    const room = socket.gameRoom;
    if (!room || !games[room]) return;
    const game = games[room];
    const opponentId = game.players.find((id) => id !== socket.id);
    // Send to opponent
    if (opponentId && io.sockets.sockets.get(opponentId)) {
      io.to(opponentId).emit("chatMessage", {
        msg: data.msg,
        fromSelf: false,
      });
    }
    // Echo to sender
    socket.emit("chatMessage", {
      msg: data.msg,
      fromSelf: true,
    });
  });

  socket.on("disconnect", () => {
    console.log(
      `Spieler ${socket.id} (${
        socket.playerName || ""
      }) hat die Verbindung getrennt.`
    );
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
      console.log(`${socket.id} aus der Warteschlange entfernt.`);
    }

    const room = socket.gameRoom;
    if (!room || !games[room]) return;
    const game = games[room];
    console.log(`Spiel ${room}: ${socket.id} hat verlassen.`);

    if (game.timeout) clearTimeout(game.timeout);

    const opponentId = game.players.find((id) => id !== socket.id);
    if (opponentId && io.sockets.sockets.get(opponentId) && !game.isFinished) {
      io.to(opponentId).emit("opponentLeft", {
        message: `${
          game.playerNames[socket.id] || "Der Gegner"
        } hat das Spiel verlassen.`,
      });
      finish(room, opponentId); // Opponent wins by default if game not finished
    }
    // If game was finished and opponent disconnects, it doesn't change the outcome
    // Clean up the game if both players are disconnected or if one disconnects after game end
    // For simplicity, we are deleting the game if one player disconnects.
    // A more robust system might keep the game for a while or handle reconnections.
    if (games[room]) {
      // If the game is ongoing and an opponent leaves, the other wins.
      // If the game is finished, the disconnect doesn't change the result but we still clean up.
      // The `finish` function already sets `isFinished` and cleans up after a delay.
      // If the game was not finished, `finish` is called above.
      // If it was finished, we just ensure it's cleaned up.
      if (game.isFinished) {
        // Game already finished, just ensure cleanup if not already scheduled by finish()
        if (!Object.values(game.rematchRequested).some((val) => val === true)) {
          // if no rematch is pending
          // Delete game if no rematch is happening and game is over
          // The finish function has its own timeout for deletion.
          // To avoid deleting twice, or too early, this part might need refinement
          // For now, rely on finish() to delete.
        }
      } else {
        // If game was not finished, finish() was called, which will delete.
      }
    }
    // If the player who disconnected was the only one left in a finished game (e.g. opponent already left)
    // we can also consider cleaning up the game room immediately.
    const remainingPlayers = game.players.filter((pId) =>
      io.sockets.sockets.get(pId)
    );
    if (remainingPlayers.length === 0 && games[room]) {
      console.log(
        `Spiel ${room}: Beide Spieler haben verlassen. Lösche Spiel.`
      );
      if (games[room].timeout) clearTimeout(games[room].timeout);
      delete games[room];
    }
  });
});

function finish(room, winnerId) {
  const game = games[room];
  if (!game || game.isFinished) return;
  game.isFinished = true;
  console.log(
    `Spiel ${room}: Wird beendet. Gewinner: ${winnerId} (${game.playerNames[winnerId]}).`
  );
  if (game.timeout) clearTimeout(game.timeout);

  const loserId = game.players.find((id) => id !== winnerId);
  const winnerScore =
    game.scores[winnerId] !== undefined ? game.scores[winnerId] : 0;
  const loserScore =
    game.scores[loserId] !== undefined ? game.scores[loserId] : 0;

  if (io.sockets.sockets.get(winnerId)) {
    io.to(winnerId).emit("gameEnd", {
      win: true,
      yourScore: winnerScore,
      opponentScore: loserScore,
      opponentName: game.playerNames[loserId],
    });
  }
  if (loserId && io.sockets.sockets.get(loserId)) {
    io.to(loserId).emit("gameEnd", {
      win: false,
      yourScore: loserScore,
      opponentScore: winnerScore,
      opponentName: game.playerNames[winnerId],
    });
  }

  // Don't delete immediately to allow for rematch requests
  // setTimeout(() => {
  //   if (games[room] && !games[room].rematchRequested[winnerId] && !games[room].rematchRequested[loserId]) {
  //       delete games[room];
  //       console.log(`Spiel ${room} nach Beendigung aus Speicher gelöscht.`);
  //   }
  // }, 30000); // Delete after 30s if no rematch
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () =>
  console.log(
    `Server läuft auf Port ${PORT}. Client erreichbar unter der vom expose_port Tool generierten URL, oder http://localhost:${PORT} bei lokaler Entwicklung.`
  )
);
