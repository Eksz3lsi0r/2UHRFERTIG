// Node-Server: Matchmaking-Logik, Punktezähler & 3-Min-Catch-up, Rematch
const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const fs = require("fs").promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware for JSON parsing
app.use(express.json());

// Leaderboard storage file
const LEADERBOARD_FILE = path.join(__dirname, "leaderboard.json");
// Accounts storage file
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

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

// Accounts helper functions
async function loadAccounts() {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty accounts
    return { accounts: {} };
  }
}

async function saveAccounts(accounts) {
  try {
    await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (error) {
    console.error("Failed to save accounts:", error);
  }
}

// Leaderboard helper functions
async function loadLeaderboard() {
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty leaderboard
    return { players: {} };
  }
}

async function saveLeaderboard(leaderboard) {
  try {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  } catch (error) {
    console.error("Failed to save leaderboard:", error);
  }
}

async function updatePlayerRanking(playerName, won, score) {
  const leaderboard = await loadLeaderboard();

  if (!leaderboard.players[playerName]) {
    leaderboard.players[playerName] = {
      name: playerName,
      rankingPoints: 1000, // Starting rating (like ELO)
      wins: 0,
      losses: 0,
      totalGames: 0,
    };
  }

  const player = leaderboard.players[playerName];
  const oldPoints = player.rankingPoints;
  player.totalGames++;

  let pointChange = 0;
  if (won) {
    player.wins++;
    // Award points for winning (base 50 + score bonus)
    pointChange = Math.min(100, 50 + Math.floor(score / 100));
    player.rankingPoints += pointChange;
  } else {
    player.losses++;
    // Lose points for losing (base -30, but never go below 0)
    pointChange = -Math.min(player.rankingPoints, 30);
    player.rankingPoints += pointChange; // pointChange is negative
  }

  await saveLeaderboard(leaderboard);
  return {
    ...player,
    oldPoints,
    pointChange,
  };
}

// API endpoints
// Authentication endpoints
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const accounts = await loadAccounts();

    // Check if username already exists
    if (accounts.accounts[username]) {
      return res.status(409).json({
        success: false,
        error: "Username already exists",
      });
    }

    // Create new account
    accounts.accounts[username] = {
      username: username,
      password: password, // In production, this should be hashed!
      createdAt: new Date().toISOString(),
      rankingPoints: 1000,
      wins: 0,
      losses: 0,
      totalGames: 0,
    };

    await saveAccounts(accounts);

    // Also initialize in leaderboard
    const leaderboard = await loadLeaderboard();
    if (!leaderboard.players[username]) {
      leaderboard.players[username] = {
        name: username,
        rankingPoints: 1000,
        wins: 0,
        losses: 0,
        totalGames: 0,
      };
      await saveLeaderboard(leaderboard);
    }

    res.json({
      success: true,
      message: "Account created successfully",
      account: {
        username: username,
        rankingPoints: 1000,
        wins: 0,
        losses: 0,
        totalGames: 0,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    const accounts = await loadAccounts();
    const account = accounts.accounts[username];

    if (!account || account.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      account: {
        username: account.username,
        rankingPoints: account.rankingPoints,
        wins: account.wins,
        losses: account.losses,
        totalGames: account.totalGames,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboard = await loadLeaderboard();
    const players = Object.values(leaderboard.players)
      .filter((p) => p.totalGames > 0) // Only show players who have played games
      .sort((a, b) => b.rankingPoints - a.rankingPoints); // Sort by ranking points descending

    res.json({
      success: true,
      players: players,
    });
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load leaderboard",
    });
  }
});

app.get("/api/player-ranking/:playerName", async (req, res) => {
  try {
    const playerName = req.params.playerName;
    const leaderboard = await loadLeaderboard();
    const player = leaderboard.players[playerName];

    if (!player) {
      // Return default values for new players
      res.json({
        success: true,
        playerName: playerName,
        rankingPoints: 1000,
        wins: 0,
        losses: 0,
        totalGames: 0,
      });
    } else {
      res.json({
        success: true,
        playerName: playerName,
        rankingPoints: player.rankingPoints,
        wins: player.wins,
        losses: player.losses,
        totalGames: player.totalGames,
      });
    }
  } catch (error) {
    console.error("Failed to get player ranking:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get player ranking",
    });
  }
});

// Matchmaking / Spielzustand
let waitingPlayer = null;
let gameCount = 0;
const games = {}; // key: room, value: { players, playerNames, scores, boards, firstFinisher, firstScore, timeout, rematchRequested, isFinished }

function initializeGameData(
  room,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  isRanked = false
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
    isRanked: isRanked, // Track if this is a ranked game
    startTime: Date.now(), // Track when the game started
  };
}

io.on("connection", async (socket) => {
  console.log("Neuer Spieler:", socket.id);

  socket.on("findGame", (data) => {
    socket.playerName = data.playerName || "Anonymous";
    socket.isRanked = data.ranked || false; // Track ranked status for this player
    if (
      waitingPlayer &&
      waitingPlayer.connected &&
      waitingPlayer.id !== socket.id
    ) {
      const room = `game-${++gameCount}`;
      const player1 = waitingPlayer;
      const player2 = socket;

      // Game is ranked if either player requested ranked play
      const isRankedGame = player1.isRanked || player2.isRanked;

      Promise.all([player1.join(room), player2.join(room)])
        .then(() => {
          player1.gameRoom = room;
          player2.gameRoom = room;

          initializeGameData(
            room,
            player1.id,
            player2.id,
            player1.playerName,
            player2.playerName,
            isRankedGame
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
        const secondPlayerScore = game.scores[opponentId] || 0;
        const firstPlayerScore = finalScore;

        // Winner is determined by highest score
        // If tied, first finisher wins (advantage for finishing first)
        let winnerId;
        if (secondPlayerScore > firstPlayerScore) {
          winnerId = opponentId; // Second player wins with higher score
        } else {
          winnerId = socket.id; // First player wins (higher score or tie)
        }

        console.log(`Timeout expired - First player (${game.playerNames[socket.id]}): ${firstPlayerScore}, Second player (${game.playerNames[opponentId]}): ${secondPlayerScore}, Winner: ${game.playerNames[winnerId]}`);
        finish(room, winnerId);
      }, 180 * 1000);
    } else {
      // Second player finishes: decide winner immediately
      if (game.timeout) clearTimeout(game.timeout);
      const firstPlayerId = game.firstFinisher;
      const firstPlayerScore = game.firstScore;
      const secondPlayerId = socket.id;
      const secondPlayerScore = finalScore;

      // Winner is determined by highest score
      // If tied, first finisher wins (advantage for finishing first)
      let winnerId;
      if (secondPlayerScore > firstPlayerScore) {
        winnerId = secondPlayerId; // Second player wins with higher score
      } else {
        winnerId = firstPlayerId; // First player wins (higher score or tie)
      }

      console.log(`Both players finished - First player (${game.playerNames[firstPlayerId]}): ${firstPlayerScore}, Second player (${game.playerNames[secondPlayerId]}): ${secondPlayerScore}, Winner: ${game.playerNames[winnerId]}`);
      finish(room, winnerId);
    }
  });
  socket.on("requestRematch", () => {
    const room = socket.gameRoom;
    if (!room || !games[room]) return;

    const oldGame = games[room];
    const wasRanked = oldGame.isRanked; // Preserve ranked status for rematch
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
            player2.playerName,
            wasRanked // Use the ranked status from the previous game
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

async function finish(room, winnerId) {
  const game = games[room];
  if (!game || game.isFinished) return;
  game.isFinished = true;
  console.log(
    `Spiel ${room}: Wird beendet. Gewinner: ${winnerId} (${game.playerNames[winnerId]}).`
  );
  if (game.timeout) clearTimeout(game.timeout);

  // Calculate time remaining for catchup games
  let timeRemaining = 0;
  if (game.firstFinisher) {
    // If the game ended by timeout, timeRemaining is 0
    // If the game ended by both players finishing, calculate how much time was left for the second player
    if (game.finishedPlayers.length === 2 && game.timeout) {
      // Game ended before timeout naturally
      const now = Date.now();
      const catchupStart = game.firstFinisherTime || game.startTime;
      const elapsed = now - catchupStart;
      const maxCatchup = 180 * 1000;
      timeRemaining = Math.max(0, Math.floor((maxCatchup - elapsed) / 1000));
    } else {
      // Game ended by timeout or only one player finished
      timeRemaining = 0;
    }
  }

  const loserId = game.players.find((id) => id !== winnerId);
  const winnerScore =
    game.scores[winnerId] !== undefined ? game.scores[winnerId] : 0;
  const loserScore =
    game.scores[loserId] !== undefined ? game.scores[loserId] : 0;

  // Update player rankings for ranked PvP games only
  let winnerRankingChange = null;
  let loserRankingChange = null;

  if (winnerId && loserId && game.isRanked) {
    const winnerName = game.playerNames[winnerId];
    const loserName = game.playerNames[loserId];

    try {
      // Update rankings and get the point changes
      const winnerResult = await updatePlayerRanking(
        winnerName,
        true,
        winnerScore
      );
      const loserResult = await updatePlayerRanking(
        loserName,
        false,
        loserScore
      );

      // Use the point changes from the update function
      winnerRankingChange = {
        oldPoints: winnerResult.oldPoints,
        newPoints: winnerResult.rankingPoints,
        change: winnerResult.pointChange,
      };

      loserRankingChange = {
        oldPoints: loserResult.oldPoints,
        newPoints: loserResult.rankingPoints,
        change: loserResult.pointChange,
      };

      console.log(
        `Ranking updated: ${winnerName} (winner, ${winnerScore} pts, ${
          winnerRankingChange.change > 0 ? "+" : ""
        }${
          winnerRankingChange.change
        }) vs ${loserName} (loser, ${loserScore} pts, ${
          loserRankingChange.change
        })`
      );
    } catch (err) {
      console.error("Failed to update rankings:", err);
    }
  }

  if (io.sockets.sockets.get(winnerId)) {
    io.to(winnerId).emit("gameEnd", {
      win: true,
      yourScore: winnerScore,
      opponentScore: loserScore,
      opponentName: game.playerNames[loserId],
      isRanked: game.isRanked,
      rankingChange: winnerRankingChange,
      timeRemaining: timeRemaining,
    });
  }
  if (loserId && io.sockets.sockets.get(loserId)) {
    io.to(loserId).emit("gameEnd", {
      win: false,
      yourScore: loserScore,
      opponentScore: winnerScore,
      opponentName: game.playerNames[winnerId],
      isRanked: game.isRanked,
      rankingChange: loserRankingChange,
      timeRemaining: timeRemaining,
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
