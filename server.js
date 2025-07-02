const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const BackgammonGame = require('./game/BackgammonGame');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const waitingPlayers = [];
const activeGames = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Ein Spieler hat sich verbunden:', socket.id);

    // Player wants to find a game
    socket.on('findGame', (playerName) => {
        const player = {
            id: socket.id,
            name: playerName || `Spieler${socket.id.substr(0, 4)}`,
            socket: socket
        };

        // Check if there's a waiting player
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();

            // Create new game
            const gameId = generateGameId();
            const game = new BackgammonGame(gameId, player, opponent);
            activeGames.set(gameId, game);

            // Join both players to game room
            socket.join(gameId);
            opponent.socket.join(gameId);

            // Notify both players that game starts
            io.to(gameId).emit('gameFound', {
                gameId: gameId,
                players: [
                    { id: player.id, name: player.name, color: 'white' },
                    { id: opponent.id, name: opponent.name, color: 'black' }
                ],
                currentPlayer: game.currentPlayer,
                board: game.board,
                dice: game.dice
            });

            console.log(`Spiel ${gameId} gestartet zwischen ${player.name} und ${opponent.name}`);
        } else {
            // Add player to waiting list
            waitingPlayers.push(player);
            socket.emit('waitingForOpponent');
            console.log(`${player.name} wartet auf einen Gegner`);
        }
    });

    // Handle game moves
    socket.on('makeMove', (data) => {
        const game = findGameByPlayerId(socket.id);
        if (game && game.isPlayerTurn(socket.id)) {
            const result = game.makeMove(socket.id, data.from, data.to);
            if (result.success) {
                io.to(game.id).emit('moveMade', {
                    move: { from: data.from, to: data.to, player: socket.id },
                    board: game.board,
                    currentPlayer: game.currentPlayer,
                    dice: game.dice,
                    gameStatus: game.status
                });

                // Check for game end
                if (game.status !== 'playing') {
                    io.to(game.id).emit('gameEnded', {
                        winner: game.winner,
                        finalBoard: game.board
                    });
                    activeGames.delete(game.id);
                }
            } else {
                socket.emit('invalidMove', result.message);
            }
        }
    });

    // Handle dice roll
    socket.on('rollDice', () => {
        const game = findGameByPlayerId(socket.id);
        if (game && game.isPlayerTurn(socket.id)) {
            game.rollDice();
            io.to(game.id).emit('diceRolled', {
                dice: game.dice,
                player: socket.id
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Spieler hat sich getrennt:', socket.id);

        // Remove from waiting list
        const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
        if (waitingIndex !== -1) {
            waitingPlayers.splice(waitingIndex, 1);
        }

        // Handle game disconnect
        const game = findGameByPlayerId(socket.id);
        if (game) {
            io.to(game.id).emit('playerDisconnected', {
                disconnectedPlayer: socket.id
            });
            activeGames.delete(game.id);
        }
    });
});

// Helper functions
function generateGameId() {
    return 'game_' + Math.random().toString(36).substr(2, 9);
}

function findGameByPlayerId(playerId) {
    for (const game of activeGames.values()) {
        if (game.hasPlayer(playerId)) {
            return game;
        }
    }
    return null;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backgammon Server läuft auf Port ${PORT}`);
    console.log(`Öffne http://localhost:${PORT} im Browser`);
});
