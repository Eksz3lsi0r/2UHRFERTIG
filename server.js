const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

// Game rooms storage
const games = new Map();
const waitingPlayers = [];
const playerGames = new Map(); // Track which game each player is in

// Backgammon game class
class BackgammonGame {
    constructor(player1Id, player2Id) {
        this.players = {
            white: player1Id,
            black: player2Id
        };
        this.currentPlayer = 'white';
        this.dice = [];
        this.doubleValue = 1;
        this.canDouble = { white: true, black: true };
        this.hasRolled = false;
        this.movesLeft = [];
        this.winner = null;
        this.winType = null;

        // Initialize board - exact backgammon starting position
        // Points 1-24, 0 = bar for white, 25 = bar for black
        this.board = new Array(26).fill(null).map(() => ({ white: 0, black: 0 }));

        // Standard backgammon starting position
        this.board[1] = { white: 2, black: 0 };
        this.board[6] = { white: 0, black: 5 };
        this.board[8] = { white: 0, black: 3 };
        this.board[12] = { white: 5, black: 0 };
        this.board[13] = { white: 0, black: 5 };
        this.board[17] = { white: 3, black: 0 };
        this.board[19] = { white: 5, black: 0 };
        this.board[24] = { white: 0, black: 2 };

        // Bear off areas
        this.bearOff = { white: 0, black: 0 };
    }

    rollDice() {
        if (this.hasRolled) return null;

        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        this.dice = [die1, die2];

        // Doubles give 4 moves
        if (die1 === die2) {
            this.movesLeft = [die1, die1, die1, die1];
        } else {
            this.movesLeft = [die1, die2];
        }

        this.hasRolled = true;
        return this.dice;
    }

    isValidMove(from, to, color) {
        if (this.currentPlayer !== color) return false;
        if (this.movesLeft.length === 0) return false;

        // Check if checker on bar
        const barPoint = color === 'white' ? 0 : 25;
        if (this.board[barPoint][color] > 0 && from !== barPoint) return false;

        // Moving from bar
        if (from === barPoint) {
            if (this.board[barPoint][color] === 0) return false;

            // Calculate entry point based on die value
            for (const die of this.movesLeft) {
                const entryPoint = color === 'white' ? die : 25 - die;
                if (entryPoint === to) {
                    const opponent = color === 'white' ? 'black' : 'white';
                    if (this.board[to][opponent] <= 1) return true;
                }
            }
            return false;
        }

        // Check if there's a checker to move
        if (this.board[from][color] === 0) return false;

        // Check if bearing off
        if (to === -1 || to === 26) {
            return this.canBearOff(color) && this.isValidBearOff(from, color);
        }

        // Normal move validation
        const direction = color === 'white' ? 1 : -1;
        const distance = Math.abs(to - from);

        if (!this.movesLeft.includes(distance)) return false;

        // Check if move is in correct direction
        if ((to - from) * direction < 0) return false;

        // Check if destination is blocked
        const opponent = color === 'white' ? 'black' : 'white';
        if (this.board[to][opponent] > 1) return false;

        return true;
    }

    makeMove(from, to, color) {
        if (!this.isValidMove(from, to, color)) return false;

        const opponent = color === 'white' ? 'black' : 'white';
        let moveDistance;

        // Moving from bar
        const barPoint = color === 'white' ? 0 : 25;
        if (from === barPoint) {
            this.board[barPoint][color]--;

            // Hit opponent if single checker
            if (this.board[to][opponent] === 1) {
                this.board[to][opponent] = 0;
                const oppBarPoint = opponent === 'white' ? 0 : 25;
                this.board[oppBarPoint][opponent]++;
            }

            this.board[to][color]++;
            moveDistance = color === 'white' ? to : 25 - to;
        }
        // Handle bearing off
        else if (to === -1 || to === 26) {
            this.board[from][color]--;
            this.bearOff[color]++;
            moveDistance = color === 'white' ? 25 - from : from;

            // Find the used die - exact match first, then smallest die >= distance
            let usedDie = null;
            for (let i = 0; i < this.movesLeft.length; i++) {
                if (this.movesLeft[i] === moveDistance) {
                    usedDie = this.movesLeft[i];
                    break;
                }
            }
            if (!usedDie) {
                for (let i = 0; i < this.movesLeft.length; i++) {
                    if (this.movesLeft[i] >= moveDistance) {
                        usedDie = this.movesLeft[i];
                        break;
                    }
                }
            }
            moveDistance = usedDie || moveDistance;
        }
        // Normal move
        else {
            this.board[from][color]--;

            // Handle hitting opponent's blot
            if (this.board[to][opponent] === 1) {
                this.board[to][opponent] = 0;
                const oppBarPoint = opponent === 'white' ? 0 : 25;
                this.board[oppBarPoint][opponent]++;
            }

            this.board[to][color]++;
            moveDistance = Math.abs(to - from);
        }

        // Remove used die value
        const index = this.movesLeft.indexOf(moveDistance);
        if (index > -1) {
            this.movesLeft.splice(index, 1);
        }

        // Check for win
        if (this.bearOff[color] === 15) {
            this.winner = color;

            // Check for gammon or backgammon
            if (this.bearOff[opponent] === 0) {
                // Check if opponent has checkers in winner's home board or on bar
                const oppBarPoint = opponent === 'white' ? 0 : 25;
                let hasCheckersInWinnerHome = false;

                if (this.board[oppBarPoint][opponent] > 0) {
                    this.winType = 'backgammon';
                } else {
                    // Check winner's home board for opponent checkers
                    const homeStart = color === 'white' ? 19 : 1;
                    const homeEnd = color === 'white' ? 24 : 6;

                    for (let i = homeStart; i <= homeEnd; i++) {
                        if (this.board[i][opponent] > 0) {
                            hasCheckersInWinnerHome = true;
                            break;
                        }
                    }

                    this.winType = hasCheckersInWinnerHome ? 'backgammon' : 'gammon';
                }
            } else {
                this.winType = 'normal';
            }
        }

        return true;
    }

    canBearOff(color) {
        // Check if all checkers are in home board
        const homeStart = color === 'white' ? 19 : 1;
        const homeEnd = color === 'white' ? 24 : 6;

        // Check bar
        const barPoint = color === 'white' ? 0 : 25;
        if (this.board[barPoint][color] > 0) return false;

        // Check all points outside home
        for (let i = 1; i <= 24; i++) {
            if ((color === 'white' && i < homeStart) || (color === 'black' && i > homeEnd)) {
                if (this.board[i][color] > 0) return false;
            }
        }

        return true;
    }

    isValidBearOff(from, color) {
        const distance = color === 'white' ? 25 - from : from;

        // Exact bear off
        if (this.movesLeft.includes(distance)) return true;

        // Can use higher die if no checkers on higher points
        const maxDie = Math.max(...this.movesLeft);
        if (maxDie >= distance) {
            // Check if this is the furthest checker
            const homeStart = color === 'white' ? 19 : 1;
            const homeEnd = color === 'white' ? 24 : 6;

            for (let i = from + (color === 'white' ? 1 : -1);
                color === 'white' ? i <= homeEnd : i >= homeStart;
                i += (color === 'white' ? 1 : -1)) {
                if (this.board[i][color] > 0) return false;
            }
            return true;
        }

        return false;
    }

    endTurn() {
        // Force end turn only if no valid moves left
        if (this.movesLeft.length === 0 || !this.hasAnyValidMoves()) {
            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            this.hasRolled = false;
            this.movesLeft = [];
            this.dice = [];
            return true;
        }
        return false;
    }

    hasAnyValidMoves() {
        const color = this.currentPlayer;
        const barPoint = color === 'white' ? 0 : 25;

        // If on bar, must enter first
        if (this.board[barPoint][color] > 0) {
            for (const die of this.movesLeft) {
                const entryPoint = color === 'white' ? die : 25 - die;
                if (this.isValidMove(barPoint, entryPoint, color)) return true;
            }
            return false;
        }

        // Check all possible moves
        for (let from = 1; from <= 24; from++) {
            if (this.board[from][color] > 0) {
                for (const die of this.movesLeft) {
                    const to = color === 'white' ? from + die : from - die;
                    if (to >= 1 && to <= 24 && this.isValidMove(from, to, color)) return true;
                }

                // Check bear off
                if (this.canBearOff(color) && this.isValidBearOff(from, color)) return true;
            }
        }

        return false;
    }

    offerDouble(color) {
        if (color !== this.currentPlayer) return false;
        if (!this.canDouble[color]) return false;
        if (this.hasRolled) return false;
        if (this.doubleValue >= 64) return false;

        return true;
    }

    acceptDouble() {
        this.doubleValue *= 2;
        const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
        this.canDouble = { white: false, black: false };
        this.canDouble[opponent] = true;
        return true;
    }

    getGameState() {
        // Convert board format for client
        const clientBoard = [];
        for (let i = 0; i <= 25; i++) {
            const checkers = [];
            for (let j = 0; j < this.board[i].white; j++) checkers.push('white');
            for (let j = 0; j < this.board[i].black; j++) checkers.push('black');
            clientBoard[i] = checkers;
        }

        return {
            board: clientBoard,
            currentPlayer: this.currentPlayer,
            dice: this.dice,
            movesLeft: this.movesLeft,
            hasRolled: this.hasRolled,
            bearOff: this.bearOff,
            bar: {
                white: this.board[0].white,
                black: this.board[25].black
            },
            doubleValue: this.doubleValue,
            canDouble: this.canDouble,
            winner: this.winner,
            winType: this.winType
        };
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    socket.on('join-queue', ({ name }) => {
        console.log(`Player ${socket.id} (${name}) joining queue`);

        // Add to waiting list or create game
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.pop();
            const gameId = `${opponent.id}-${socket.id}`;

            const game = new BackgammonGame(opponent.id, socket.id);
            games.set(gameId, game);
            playerGames.set(opponent.id, gameId);
            playerGames.set(socket.id, gameId);

            // Join both players to the game room
            opponent.join(gameId);
            socket.join(gameId);

            console.log(`Game created: ${gameId}`);

            // Assign colors and start game
            opponent.emit('game-started', {
                gameId,
                playerColor: 'white',
                opponentId: socket.id
            });
            socket.emit('game-started', {
                gameId,
                playerColor: 'black',
                opponentId: opponent.id
            });

            // Send initial game state
            const gameState = game.getGameState();

            // Convert board format for client
            const clientBoard = [];
            for (let i = 0; i < 24; i++) {
                clientBoard[i] = gameState.board[i + 1];
            }

            io.to(gameId).emit('game-updated', {
                board: clientBoard,
                currentPlayer: gameState.currentPlayer,
                dice: gameState.dice,
                availableMoves: gameState.movesLeft,
                hasRolled: gameState.hasRolled,
                bar: gameState.bar,
                home: gameState.bearOff,
                doubleValue: gameState.doubleValue,
                canDouble: gameState.canDouble,
                winner: gameState.winner
            });
        } else {
            waitingPlayers.push(socket);
            socket.emit('waiting-for-opponent');
            console.log(`Player ${socket.id} added to waiting list`);
        }
    });

    socket.on('leave-queue', () => {
        const index = waitingPlayers.findIndex(player => player.id === socket.id);
        if (index > -1) {
            waitingPlayers.splice(index, 1);
            console.log(`Player ${socket.id} left queue`);
        }
    });

    socket.on('roll-dice', () => {
        const gameId = playerGames.get(socket.id);
        const game = games.get(gameId);
        if (!game) return;

        const playerId = socket.id;
        const playerColor = game.players.white === playerId ? 'white' : 'black';

        if (playerColor !== game.currentPlayer) {
            socket.emit('error', { message: 'Nicht dein Zug!' });
            return;
        }

        const dice = game.rollDice();
        if (dice) {
            io.to(gameId).emit('dice-rolled', {
                dice,
                movesLeft: game.movesLeft,
                roller: playerColor
            });

            // Send updated game state
            const gameState = game.getGameState();
            const clientBoard = [];
            for (let i = 0; i < 24; i++) {
                clientBoard[i] = gameState.board[i + 1];
            }

            io.to(gameId).emit('game-updated', {
                board: clientBoard,
                currentPlayer: gameState.currentPlayer,
                dice: gameState.dice,
                availableMoves: gameState.movesLeft,
                hasRolled: gameState.hasRolled,
                bar: gameState.bar,
                home: gameState.bearOff,
                doubleValue: gameState.doubleValue,
                canDouble: gameState.canDouble,
                winner: gameState.winner
            });

            // Only check for no valid moves after a delay to give player time to see the dice
            // This allows the player to see what they rolled before auto-ending
            setTimeout(() => {
                const currentGame = games.get(gameId);
                if (currentGame && currentGame.currentPlayer === playerColor && !currentGame.hasAnyValidMoves()) {
                    console.log(`Player ${playerColor} has no valid moves, ending turn automatically`);
                    currentGame.endTurn();
                    io.to(gameId).emit('turn-changed', {
                        currentPlayer: currentGame.currentPlayer,
                        gameState: currentGame.getGameState()
                    });

                    const updatedState = currentGame.getGameState();
                    const updatedClientBoard = [];
                    for (let i = 0; i < 24; i++) {
                        updatedClientBoard[i] = updatedState.board[i + 1];
                    }

                    io.to(gameId).emit('game-updated', {
                        board: updatedClientBoard,
                        currentPlayer: updatedState.currentPlayer,
                        dice: updatedState.dice,
                        availableMoves: updatedState.movesLeft,
                        hasRolled: updatedState.hasRolled,
                        bar: updatedState.bar,
                        home: updatedState.bearOff,
                        doubleValue: updatedState.doubleValue,
                        canDouble: updatedState.canDouble,
                        winner: updatedState.winner
                    });
                }
            }, 3000); // Give player 3 seconds to see their dice
        }
    });

    socket.on('make-move', ({ from, to, dieValue }) => {
        const gameId = playerGames.get(socket.id);
        const game = games.get(gameId);
        if (!game) return;

        const playerId = socket.id;
        const playerColor = game.players.white === playerId ? 'white' : 'black';

        if (playerColor !== game.currentPlayer) {
            socket.emit('move-error', { message: 'Nicht dein Zug!' });
            return;
        }

        // Convert client format to server format
        let serverFrom, serverTo;

        if (from === -1) {
            // Moving from bar
            serverFrom = playerColor === 'white' ? 0 : 25;
            serverTo = to + 1; // Client uses 0-23, server uses 1-24
        } else if (to === 25) {
            // Bearing off
            serverFrom = from + 1;
            serverTo = playerColor === 'white' ? 26 : -1;
        } else {
            // Normal move
            serverFrom = from + 1;
            serverTo = to + 1;
        }

        if (game.makeMove(serverFrom, serverTo, playerColor)) {
            io.to(gameId).emit('move-made', {
                from,
                to,
                player: playerColor,
                dieValue
            });

            // Convert and send updated game state
            const gameState = game.getGameState();

            // Convert board format for client
            const clientBoard = [];
            for (let i = 0; i < 24; i++) {
                clientBoard[i] = gameState.board[i + 1];
            }

            io.to(gameId).emit('game-updated', {
                board: clientBoard,
                currentPlayer: gameState.currentPlayer,
                dice: gameState.dice,
                availableMoves: gameState.movesLeft,
                hasRolled: gameState.hasRolled,
                bar: gameState.bar,
                home: gameState.bearOff,
                doubleValue: gameState.doubleValue,
                canDouble: gameState.canDouble,
                winner: gameState.winner
            });

            if (game.winner) {
                const winPoints = game.winType === 'backgammon' ? 3 :
                    game.winType === 'gammon' ? 2 : 1;
                io.to(gameId).emit('game-finished', {
                    winner: game.winner,
                    winType: game.winType,
                    points: winPoints * game.doubleValue
                });
                games.delete(gameId);
                playerGames.delete(game.players.white);
                playerGames.delete(game.players.black);
            } else if (game.movesLeft.length === 0 || !game.hasAnyValidMoves()) {
                setTimeout(() => {
                    game.endTurn();
                    io.to(gameId).emit('turn-changed', {
                        currentPlayer: game.currentPlayer
                    });

                    const updatedState = game.getGameState();
                    const updatedClientBoard = [];
                    for (let i = 0; i < 24; i++) {
                        updatedClientBoard[i] = updatedState.board[i + 1];
                    }

                    io.to(gameId).emit('game-updated', {
                        board: updatedClientBoard,
                        currentPlayer: updatedState.currentPlayer,
                        dice: updatedState.dice,
                        availableMoves: updatedState.movesLeft,
                        hasRolled: updatedState.hasRolled,
                        bar: updatedState.bar,
                        home: updatedState.bearOff,
                        doubleValue: updatedState.doubleValue,
                        canDouble: updatedState.canDouble,
                        winner: updatedState.winner
                    });
                }, 1500);
            }
        } else {
            socket.emit('move-error', { message: 'Ungültiger Zug!' });
        }
    });

    socket.on('end-turn', () => {
        const gameId = playerGames.get(socket.id);
        const game = games.get(gameId);
        if (!game) return;

        const playerId = socket.id;
        const playerColor = game.players.white === playerId ? 'white' : 'black';

        if (playerColor !== game.currentPlayer) {
            socket.emit('error', { message: 'Nicht dein Zug!' });
            return;
        }

        if (game.endTurn()) {
            io.to(gameId).emit('turn-changed', { currentPlayer: game.currentPlayer });

            const gameState = game.getGameState();
            const clientBoard = [];
            for (let i = 0; i < 24; i++) {
                clientBoard[i] = gameState.board[i + 1];
            }

            io.to(gameId).emit('game-updated', {
                board: clientBoard,
                currentPlayer: gameState.currentPlayer,
                dice: gameState.dice,
                availableMoves: gameState.movesLeft,
                hasRolled: gameState.hasRolled,
                bar: gameState.bar,
                home: gameState.bearOff,
                doubleValue: gameState.doubleValue,
                canDouble: gameState.canDouble,
                winner: gameState.winner
            });
        }
    });

    socket.on('offerDouble', ({ gameId, color }) => {
        const game = games.get(gameId);
        if (!game || !game.offerDouble(color)) return;

        const opponent = color === 'white' ? game.players.black : game.players.white;
        io.to(opponent).emit('doubleOffered', {
            currentValue: game.doubleValue,
            newValue: game.doubleValue * 2
        });
    });

    socket.on('respondToDouble', ({ gameId, accept }) => {
        const game = games.get(gameId);
        if (!game) return;

        if (accept) {
            game.acceptDouble();
            io.to(gameId).emit('doubleAccepted', { newValue: game.doubleValue });
            io.to(gameId).emit('gameState', game.getGameState());
        } else {
            const winner = game.currentPlayer;
            game.winner = winner;
            io.to(gameId).emit('gameOver', {
                winner,
                resigned: true,
                points: game.doubleValue
            });
            games.delete(gameId);
            playerGames.delete(game.players.white);
            playerGames.delete(game.players.black);
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);

        // Remove from waiting list
        const index = waitingPlayers.findIndex(player => player.id === socket.id);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }

        // Handle game disconnection
        const gameId = playerGames.get(socket.id);
        if (gameId) {
            const game = games.get(gameId);
            if (game) {
                // Notify other player about disconnection
                const otherPlayerId = game.players.white === socket.id ?
                    game.players.black : game.players.white;
                io.to(otherPlayerId).emit('opponent-disconnected');

                // Clean up game after timeout
                setTimeout(() => {
                    if (games.has(gameId)) {
                        games.delete(gameId);
                        playerGames.delete(game.players.white);
                        playerGames.delete(game.players.black);
                    }
                }, 30000); // 30 seconds grace period
            }
        }
    });
});

// Helper function to get local IP
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
const localIP = getLocalIPAddress();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎲 Backgammon Server läuft auf:`);
    console.log(`   Lokal: http://localhost:${PORT}`);
    console.log(`   Netzwerk: http://${localIP}:${PORT}`);
    console.log(`   Bereit für Multiplayer-Spiele!`);
});
