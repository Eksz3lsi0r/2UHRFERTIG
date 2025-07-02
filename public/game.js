class BackgammonClient {
    constructor() {
        this.socket = io();
        this.gameId = null;
        this.playerId = null;
        this.playerName = '';
        this.currentPlayer = null;
        this.selectedPoint = null;
        this.gameBoard = new Array(24).fill(0);
        this.dice = [0, 0];
        this.isMyTurn = false;

        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    initializeElements() {
        // Screens
        this.startScreen = document.getElementById('startScreen');
        this.waitingScreen = document.getElementById('waitingScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');

        // UI Elements
        this.playerNameInput = document.getElementById('playerName');
        this.findGameBtn = document.getElementById('findGameBtn');
        this.cancelWaitBtn = document.getElementById('cancelWaitBtn');
        this.rollDiceBtn = document.getElementById('rollDiceBtn');
        this.leaveGameBtn = document.getElementById('leaveGameBtn');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.backToMenuBtn = document.getElementById('backToMenuBtn');

        // Game elements
        this.player1Info = document.getElementById('player1Info');
        this.player2Info = document.getElementById('player2Info');
        this.currentTurnEl = document.getElementById('currentTurn');
        this.gameMessageEl = document.getElementById('gameMessage');
        this.dice1El = document.getElementById('dice1');
        this.dice2El = document.getElementById('dice2');
        this.gameBoardEl = document.getElementById('gameBoard');
        this.gameResultEl = document.getElementById('gameResult');
        this.winnerTextEl = document.getElementById('winnerText');
    }

    setupEventListeners() {
        this.findGameBtn.addEventListener('click', () => this.findGame());
        this.cancelWaitBtn.addEventListener('click', () => this.cancelWait());
        this.rollDiceBtn.addEventListener('click', () => this.rollDice());
        this.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        this.newGameBtn.addEventListener('click', () => this.findGame());
        this.backToMenuBtn.addEventListener('click', () => this.backToMenu());

        // Enter key for player name
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.findGame();
            }
        });

        // Board click handling
        this.gameBoardEl.addEventListener('click', (e) => this.handleBoardClick(e));
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Mit Server verbunden');
            this.playerId = this.socket.id;
        });

        this.socket.on('waitingForOpponent', () => {
            this.showScreen('waitingScreen');
        });

        this.socket.on('gameFound', (data) => {
            console.log('Spiel gefunden:', data);
            this.gameId = data.gameId;
            this.currentPlayer = data.currentPlayer;
            this.gameBoard = data.board;
            this.dice = data.dice;

            this.setupGameInfo(data.players);
            this.renderBoard();
            this.updateGameState();
            this.showScreen('gameScreen');
        });

        this.socket.on('moveMade', (data) => {
            console.log('Zug gemacht:', data);
            this.gameBoard = data.board;
            this.currentPlayer = data.currentPlayer;
            this.dice = data.dice;

            this.renderBoard();
            this.updateGameState();
            this.clearSelection();
        });

        this.socket.on('diceRolled', (data) => {
            console.log('Würfel geworfen:', data);
            this.dice = data.dice;
            this.updateDiceDisplay();
            this.updateGameState();
        });

        this.socket.on('invalidMove', (message) => {
            this.showMessage(message, 'error');
        });

        this.socket.on('gameEnded', (data) => {
            console.log('Spiel beendet:', data);
            this.showGameOver(data.winner);
        });

        this.socket.on('playerDisconnected', (data) => {
            this.showMessage('Gegner hat das Spiel verlassen', 'info');
            setTimeout(() => this.backToMenu(), 3000);
        });
    }

    findGame() {
        this.playerName = this.playerNameInput.value.trim() || 'Anonymer Spieler';
        this.socket.emit('findGame', this.playerName);
    }

    cancelWait() {
        this.socket.disconnect();
        this.socket.connect();
        this.showScreen('startScreen');
    }

    rollDice() {
        if (this.isMyTurn) {
            this.socket.emit('rollDice');
            this.rollDiceBtn.disabled = true;
        }
    }

    leaveGame() {
        this.socket.disconnect();
        this.socket.connect();
        this.backToMenu();
    }

    backToMenu() {
        this.gameId = null;
        this.currentPlayer = null;
        this.selectedPoint = null;
        this.gameBoard = new Array(24).fill(0);
        this.dice = [0, 0];
        this.isMyTurn = false;
        this.clearSelection();
        this.showScreen('startScreen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    setupGameInfo(players) {
        const myPlayer = players.find(p => p.id === this.playerId);
        const opponent = players.find(p => p.id !== this.playerId);

        if (myPlayer) {
            this.player1Info.querySelector('.player-name').textContent = myPlayer.name;
            this.player1Info.className = `player ${myPlayer.color}`;
        }

        if (opponent) {
            this.player2Info.querySelector('.player-name').textContent = opponent.name;
            this.player2Info.className = `player ${opponent.color}`;
        }
    }

    updateGameState() {
        this.isMyTurn = this.currentPlayer === this.playerId;

        if (this.isMyTurn) {
            this.currentTurnEl.textContent = 'Dein Zug';
            this.rollDiceBtn.disabled = this.dice[0] > 0 && this.dice[1] > 0;
        } else {
            this.currentTurnEl.textContent = 'Gegner ist dran';
            this.rollDiceBtn.disabled = true;
        }

        this.updateDiceDisplay();
    }

    updateDiceDisplay() {
        this.dice1El.textContent = this.dice[0] || '?';
        this.dice2El.textContent = this.dice[1] || '?';
    }

    renderBoard() {
        // Clear existing pieces
        document.querySelectorAll('.piece').forEach(piece => piece.remove());

        // Render pieces on each point
        for (let pointIndex = 0; pointIndex < 24; pointIndex++) {
            const point = document.querySelector(`[data-point="${pointIndex}"]`);
            const pieceCount = Math.abs(this.gameBoard[pointIndex]);
            const isWhite = this.gameBoard[pointIndex] > 0;

            if (pieceCount > 0) {
                for (let i = 0; i < pieceCount; i++) {
                    const piece = document.createElement('div');
                    piece.className = `piece ${isWhite ? 'white' : 'black'}`;
                    piece.dataset.point = pointIndex;
                    point.appendChild(piece);
                }
            }
        }
    }

    handleBoardClick(e) {
        if (!this.isMyTurn || (this.dice[0] === 0 && this.dice[1] === 0)) {
            return;
        }

        const clickedPoint = e.target.closest('[data-point]');
        if (!clickedPoint) return;

        const pointIndex = parseInt(clickedPoint.dataset.point);

        if (this.selectedPoint === null) {
            // Select a point to move from
            if (this.canSelectPoint(pointIndex)) {
                this.selectPoint(pointIndex);
            }
        } else if (this.selectedPoint === pointIndex) {
            // Deselect the same point
            this.clearSelection();
        } else {
            // Try to move to the clicked point
            this.makeMove(this.selectedPoint, pointIndex);
        }
    }

    canSelectPoint(pointIndex) {
        const piece = this.gameBoard[pointIndex];
        const myColor = this.getMyColor();

        if (myColor === 'white') {
            return piece > 0;
        } else {
            return piece < 0;
        }
    }

    selectPoint(pointIndex) {
        this.clearSelection();
        this.selectedPoint = pointIndex;

        const point = document.querySelector(`[data-point="${pointIndex}"]`);
        point.classList.add('selected');

        // Highlight valid moves
        this.highlightValidMoves(pointIndex);
    }

    clearSelection() {
        this.selectedPoint = null;
        document.querySelectorAll('.point').forEach(point => {
            point.classList.remove('selected', 'valid-move');
        });
    }

    highlightValidMoves(fromPoint) {
        const myColor = this.getMyColor();
        const direction = myColor === 'white' ? 1 : -1;

        for (const dieValue of this.dice) {
            if (dieValue > 0) {
                const toPoint = fromPoint + (dieValue * direction);
                if (toPoint >= 0 && toPoint < 24) {
                    const targetPoint = document.querySelector(`[data-point="${toPoint}"]`);
                    if (targetPoint && this.isValidMove(fromPoint, toPoint)) {
                        targetPoint.classList.add('valid-move');
                    }
                }
            }
        }
    }

    isValidMove(from, to) {
        const myColor = this.getMyColor();
        const targetPiece = this.gameBoard[to];

        // Check if destination is blocked
        if (myColor === 'white' && targetPiece < -1) return false;
        if (myColor === 'black' && targetPiece > 1) return false;

        return true;
    }

    makeMove(from, to) {
        this.socket.emit('makeMove', { from, to });
        this.clearSelection();
    }

    getMyColor() {
        const player1Class = this.player1Info.className;
        return player1Class.includes('white') ? 'white' : 'black';
    }

    showMessage(message, type = 'info') {
        this.gameMessageEl.textContent = message;
        this.gameMessageEl.className = type;

        setTimeout(() => {
            this.gameMessageEl.textContent = '';
            this.gameMessageEl.className = '';
        }, 3000);
    }

    showGameOver(winnerId) {
        const isWinner = winnerId === this.playerId;
        this.gameResultEl.textContent = isWinner ? '🎉 Du hast gewonnen!' : '😞 Du hast verloren';
        this.winnerTextEl.textContent = isWinner ?
            'Herzlichen Glückwunsch zum Sieg!' :
            'Viel Glück beim nächsten Spiel!';

        this.showScreen('gameOverScreen');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BackgammonClient();
});
