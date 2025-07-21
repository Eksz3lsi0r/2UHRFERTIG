class BackgammonGame {
    constructor(gameId, player1, player2) {
        this.id = gameId;
        this.player1 = player1;
        this.player2 = player2;
        this.currentPlayer = player1.id;
        this.status = 'playing'; // 'playing', 'finished'
        this.winner = null;
        this.dice = [0, 0];
        this.diceUsed = [false, false];
        this.board = this.initializeBoard();
        this.moveHistory = [];
    }

    initializeBoard() {
        // Backgammon board representation
        // Index 0-23 represents the 24 points on the board
        // Positive numbers = white pieces, negative numbers = black pieces
        const board = new Array(24).fill(0);

        // Initial setup for standard backgammon
        board[0] = 2;   // White: 2 pieces on point 1
        board[11] = 5;  // White: 5 pieces on point 12
        board[16] = 3;  // White: 3 pieces on point 17
        board[18] = 5;  // White: 5 pieces on point 19

        board[23] = -2; // Black: 2 pieces on point 24
        board[12] = -5; // Black: 5 pieces on point 13
        board[7] = -3;  // Black: 3 pieces on point 8
        board[5] = -5;  // Black: 5 pieces on point 6

        return board;
    }

    hasPlayer(playerId) {
        return this.player1.id === playerId || this.player2.id === playerId;
    }

    isPlayerTurn(playerId) {
        return this.currentPlayer === playerId;
    }

    getPlayerColor(playerId) {
        return this.player1.id === playerId ? 'white' : 'black';
    }

    rollDice() {
        this.dice = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];
        this.diceUsed = [false, false];

        // If doubles, player gets 4 moves
        if (this.dice[0] === this.dice[1]) {
            this.dice = [this.dice[0], this.dice[0], this.dice[0], this.dice[0]];
            this.diceUsed = [false, false, false, false];
        }
    }

    makeMove(playerId, from, to) {
        if (!this.isPlayerTurn(playerId)) {
            return { success: false, message: 'Nicht dein Zug!' };
        }

        const color = this.getPlayerColor(playerId);
        const isWhite = color === 'white';

        // Validate move
        const validation = this.validateMove(from, to, isWhite);
        if (!validation.success) {
            return validation;
        }

        // Execute move
        this.executeMove(from, to, isWhite);

        // Mark dice as used
        this.markDiceUsed(Math.abs(to - from));

        // Check if all dice are used or no more moves possible
        if (this.allDiceUsed() || !this.hasValidMoves(isWhite)) {
            this.switchPlayer();
        }

        // Check for win condition
        if (this.checkWinCondition(isWhite)) {
            this.status = 'finished';
            this.winner = playerId;
        }

        return { success: true };
    }

    validateMove(from, to, isWhite) {
        // Basic validation
        if (from < 0 || from > 23 || to < 0 || to > 23) {
            return { success: false, message: 'Ungültige Position!' };
        }

        // Check if there's a piece to move
        const piece = this.board[from];
        if ((isWhite && piece <= 0) || (!isWhite && piece >= 0)) {
            return { success: false, message: 'Keine Figur an dieser Position!' };
        }

        // Check direction of movement
        const distance = isWhite ? to - from : from - to;
        if (distance <= 0) {
            return { success: false, message: 'Ungültige Bewegungsrichtung!' };
        }

        // Check if dice allows this move
        if (!this.isDiceAvailable(distance)) {
            return { success: false, message: 'Würfel erlaubt diesen Zug nicht!' };
        }

        // Check if destination is blocked
        const destPiece = this.board[to];
        if ((isWhite && destPiece < -1) || (!isWhite && destPiece > 1)) {
            return { success: false, message: 'Zielfeld ist blockiert!' };
        }

        return { success: true };
    }

    executeMove(from, to, isWhite) {
        const multiplier = isWhite ? 1 : -1;

        // Remove piece from source
        this.board[from] -= multiplier;

        // Handle hitting opponent piece
        if ((isWhite && this.board[to] === -1) || (!isWhite && this.board[to] === 1)) {
            this.board[to] = 0; // Remove hit piece (should go to bar in full implementation)
        }

        // Add piece to destination
        this.board[to] += multiplier;

        // Record move
        this.moveHistory.push({ from, to, player: this.currentPlayer });
    }

    isDiceAvailable(distance) {
        for (let i = 0; i < this.dice.length; i++) {
            if (!this.diceUsed[i] && this.dice[i] === distance) {
                return true;
            }
        }
        return false;
    }

    markDiceUsed(distance) {
        for (let i = 0; i < this.dice.length; i++) {
            if (!this.diceUsed[i] && this.dice[i] === distance) {
                this.diceUsed[i] = true;
                break;
            }
        }
    }

    allDiceUsed() {
        return this.diceUsed.every(used => used);
    }

    hasValidMoves(isWhite) {
        // Simplified check - in full implementation would check all possible moves
        for (let from = 0; from < 24; from++) {
            const piece = this.board[from];
            if ((isWhite && piece > 0) || (!isWhite && piece < 0)) {
                for (let i = 0; i < this.dice.length; i++) {
                    if (!this.diceUsed[i]) {
                        const to = isWhite ? from + this.dice[i] : from - this.dice[i];
                        if (to >= 0 && to < 24) {
                            const validation = this.validateMove(from, to, isWhite);
                            if (validation.success) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    checkWinCondition(isWhite) {
        // Simplified win condition - all pieces off the board
        const multiplier = isWhite ? 1 : -1;
        for (let i = 0; i < 24; i++) {
            if ((isWhite && this.board[i] > 0) || (!isWhite && this.board[i] < 0)) {
                return false;
            }
        }
        return true;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === this.player1.id ? this.player2.id : this.player1.id;
        this.dice = [0, 0];
        this.diceUsed = [false, false];
    }
}

module.exports = BackgammonGame;
