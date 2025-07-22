// Multiplayer Game Class - Handles all multiplayer game logic and socket communication

class MultiplayerBackgammon {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.gameState = {
            board: Array(24).fill(null).map(() => []),
            availableMoves: [],
            hasRolled: false,
            home: { white: 0, black: 0 },
            bar: { white: 0, black: 0 },
            currentPlayer: null,
            dice: []
        };
        this.playerColor = null;
        this.gameId = null;
        this.selectedPoint = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.initializeSocket();
        this.setupEvents();
    }

    initializeSocket() {
        console.log('🔌 Initializing socket connection...');

        const socketUrl = window.location.origin;
        this.socket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            forceNew: true,
            reconnection: true,
            timeout: 20000,
            reconnectionDelay: 1000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server:', this.socket.id);
            this.updateConnectionStatus(true);
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.updateConnectionStatus(false);
            this.showMessage('Verbindung zum Server verloren');

            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('💥 Connection error:', error);
            this.updateConnectionStatus(false);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.showMessage('Kann keine Verbindung zum Server herstellen. Bitte Seite neu laden.');
            } else {
                this.showMessage(`Verbindungsfehler. Wiederholung ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
            this.updateConnectionStatus(true);
            this.showMessage('Verbindung wiederhergestellt!');
        });

        this.socket.on('queue-joined', (data) => {
            console.log('🎯 Joined queue:', data);
            this.updateLobbyStatus(`In der Warteschlange... Position: ${data.position}`);
        });

        this.socket.on('waiting-for-opponent', () => {
            console.log('⏳ Waiting for opponent...');
            this.updateLobbyStatus('Warte auf Gegner...');
        });

        this.socket.on('game-started', (data) => {
            console.log('🎮 Game started:', data);
            this.gameId = data.gameId;
            this.playerColor = data.playerColor;

            // Merge with default gameState structure
            this.gameState = {
                ...this.gameState,
                ...data.gameState,
                board: data.gameState?.board || Array(24).fill(null).map(() => []),
                availableMoves: data.gameState?.availableMoves || [],
                home: data.gameState?.home || { white: 0, black: 0 },
                bar: data.gameState?.bar || { white: 0, black: 0 }
            };

            this.app.showMultiplayerGame();
            this.updatePlayerNames(data);
            this.render();

            this.showMessage(`Spiel gestartet! Du spielst als ${this.playerColor === 'white' ? 'Weiß' : 'Schwarz'}`);

            // Automatisches Würfeln beim Spielstart wenn der Spieler an der Reihe ist
            if (this.gameState && this.gameState.currentPlayer === this.playerColor && !this.gameState.hasRolled) {
                setTimeout(() => {
                    if (this.gameState && !this.gameState.hasRolled && this.gameState.currentPlayer === this.playerColor) {
                        this.socket.emit('roll-dice');
                    }
                }, 200);
            }
        });

        this.socket.on('game-updated', (gameState) => {
            console.log('📊 Game state updated:', gameState);
            console.log('📊 Available moves in update:', gameState?.availableMoves);

            // Merge with existing gameState structure
            this.gameState = {
                ...this.gameState,
                ...gameState,
                board: gameState?.board || Array(24).fill(null).map(() => []),
                availableMoves: gameState?.availableMoves || [],
                home: gameState?.home || { white: 0, black: 0 },
                bar: gameState?.bar || { white: 0, black: 0 }
            };

            console.log('📊 Final gameState after merge:', this.gameState);
            this.render();
        });

        this.socket.on('dice-rolled', (data) => {
            console.log('🎲 Dice rolled:', data);
            const die1 = document.getElementById('die1');
            const die2 = document.getElementById('die2');

            die1.classList.add('rolling');
            die2.classList.add('rolling');

            setTimeout(() => {
                die1.textContent = data.dice[0];
                die2.textContent = data.dice[1];
                die1.classList.remove('rolling');
                die2.classList.remove('rolling');

                // Merge dice roll data with existing gameState
                if (this.gameState) {
                    this.gameState = {
                        ...this.gameState,
                        dice: data.dice,
                        availableMoves: data.movesLeft || [],
                        hasRolled: true
                    };
                } else {
                    // Initialize gameState if it doesn't exist
                    this.gameState = {
                        board: Array(24).fill(null).map(() => []),
                        dice: data.dice,
                        availableMoves: data.movesLeft || [],
                        hasRolled: true,
                        home: { white: 0, black: 0 },
                        bar: { white: 0, black: 0 }
                    };
                }

                this.updateMoveInfo();
                this.updateButtons();

                if (data.dice[0] === data.dice[1]) {
                    this.showMessage(`Pasch! ${data.dice[0]}er Pasch gewürfelt!`);
                }

                console.log('Updated gameState after dice roll:', this.gameState);
            }, 500);
        });

        this.socket.on('turn-changed', (data) => {
            console.log('🔄 Turn changed:', data);

            // Sicherstellen, dass gameState korrekt aktualisiert wird
            if (data.gameState) {
                this.gameState = {
                    ...this.gameState,
                    ...data.gameState,
                    board: data.gameState.board || this.gameState.board,
                    availableMoves: data.gameState.availableMoves || [],
                    home: data.gameState.home || this.gameState.home,
                    bar: data.gameState.bar || this.gameState.bar,
                    hasRolled: data.gameState.hasRolled || false
                };
            } else {
                // Fallback: nur currentPlayer aktualisieren
                this.gameState.currentPlayer = data.currentPlayer;
                this.gameState.hasRolled = false; // Neuer Zug beginnt ohne Würfeln
            }

            this.render();

            const currentPlayerName = data.currentPlayer === 'white' ? 'Weiß' : 'Schwarz';
            const isMyTurn = data.currentPlayer === this.playerColor;

            if (isMyTurn) {
                this.showMessage('Du bist am Zug!');
                // Automatisches Würfeln beim Spielerwechsel
                if (this.gameState && !this.gameState.hasRolled) {
                    setTimeout(() => {
                        if (this.gameState && !this.gameState.hasRolled && this.gameState.currentPlayer === this.playerColor) {
                            this.socket.emit('roll-dice');
                        }
                    }, 200);
                }
            } else {
                this.showMessage(`${currentPlayerName} ist am Zug`);
            }
        });

        this.socket.on('move-error', (data) => {
            console.log('❌ Move error:', data.message);
            this.showMessage(data.message);
        });

        this.socket.on('dice-error', (data) => {
            console.log('❌ Dice error:', data.message);
            this.showMessage(data.message);
        });

        this.socket.on('game-finished', (data) => {
            console.log('🏆 Game finished:', data);
            const winner = data.winner === 'white' ? 'Weiß' : 'Schwarz';
            const isWinner = data.winner === this.playerColor;

            if (isWinner) {
                this.showMessage(`🎉 Du hast gewonnen!`);
            } else {
                this.showMessage(`${winner} hat gewonnen!`);
            }

            setTimeout(() => this.app.showMenu(), 5000);
        });

        this.socket.on('player-disconnected', (data) => {
            console.log('👋 Player disconnected:', data.message);
            this.showMessage(data.message);
            setTimeout(() => this.app.showMenu(), 3000);
        });
    }

    setupEvents() {
        // Lobby events
        document.getElementById('findOpponentBtn').addEventListener('click', () => {
            this.startMatchmaking();
        });

        document.getElementById('cancelSearchBtn').addEventListener('click', () => {
            this.cancelSearch();
        });

        // Game events
        // Board click events
        document.getElementById('board').addEventListener('click', (e) => {
            this.handleBoardClick(e);
        });

        // Bar click events
        document.addEventListener('click', (e) => {
            const barEl = e.target.closest('.bar');
            if (barEl && this.gameState) {
                this.handleBarClick();
            }
        });

        // Home click events
        document.getElementById('homeWhite').addEventListener('click', () => {
            if (this.playerColor === 'white') {
                this.handleHomeClick();
            }
        });

        document.getElementById('homeBlack').addEventListener('click', () => {
            if (this.playerColor === 'black') {
                this.handleHomeClick();
            }
        });

        // Enter key in name input
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startMatchmaking();
            }
        });
    }

    startMatchmaking() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            this.showMessage('Bitte gib deinen Namen ein!');
            document.getElementById('playerName').focus();
            return;
        }

        if (!this.socket || !this.socket.connected) {
            this.showMessage('Keine Verbindung zum Server. Versuche zu verbinden...');
            this.initializeSocket();

            setTimeout(() => {
                if (this.socket && this.socket.connected) {
                    this.startMatchmaking();
                }
            }, 2000);
            return;
        }

        console.log('🎯 Starting matchmaking with name:', playerName);
        this.socket.emit('join-queue', { name: playerName });

        document.getElementById('findOpponentBtn').style.display = 'none';
        document.getElementById('cancelSearchBtn').style.display = 'block';
        document.getElementById('playerName').disabled = true;

        this.updateLobbyStatus('🔍 Suche nach Gegner...');
    }

    cancelSearch() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('leave-queue');
        }

        document.getElementById('findOpponentBtn').style.display = 'block';
        document.getElementById('cancelSearchBtn').style.display = 'none';
        document.getElementById('playerName').disabled = false;

        this.updateLobbyStatus('');
        console.log('🚫 Search cancelled');
    }

    updateLobbyStatus(status) {
        const statusEl = document.getElementById('lobbyStatus');
        statusEl.innerHTML = status ? `<div class="waiting-animation">${status}</div>` : '';
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = connected ? 'Verbunden' : 'Getrennt';
        statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }

    updatePlayerNames(data) {
        document.getElementById('whitePlayerName').textContent =
            this.playerColor === 'white' ? 'Du (Weiß)' : data.opponent + ' (Weiß)';
        document.getElementById('blackPlayerName').textContent =
            this.playerColor === 'black' ? 'Du (Schwarz)' : data.opponent + ' (Schwarz)';
    }

    updateMoveInfo() {
        const moveInfo = document.getElementById('moveInfo');
        if (this.gameState.availableMoves && this.gameState.availableMoves.length > 0) {
            moveInfo.textContent = `Verfügbare Züge: ${this.gameState.availableMoves.join(', ')}`;
        } else {
            moveInfo.textContent = '';
        }
    }

    updateButtons() {
        // Roll dice button is handled by server
    }

    canRoll() {
        return this.gameState &&
            this.gameState.currentPlayer === this.playerColor &&
            !this.gameState.hasRolled;
    }

    handleBoardClick(e) {
        if (!this.gameState || this.gameState.currentPlayer !== this.playerColor) {
            return;
        }

        const pointEl = e.target.closest('.point');
        if (pointEl) {
            const pointIndex = parseInt(pointEl.dataset.point);
            this.handlePointClick(pointIndex);
        }
    }

    handlePointClick(pointIndex) {
        console.log('🎯 Point click debug:', {
            gameState: !!this.gameState,
            currentPlayer: this.gameState?.currentPlayer,
            playerColor: this.playerColor,
            hasRolled: this.gameState?.hasRolled,
            availableMoves: this.gameState?.availableMoves,
            movesLength: this.gameState?.availableMoves?.length
        });

        // Check if it's the player's turn
        if (!this.gameState || this.gameState.currentPlayer !== this.playerColor) {
            this.showMessage('Du bist nicht am Zug!');
            return;
        }

        // If dice haven't been rolled yet, trigger automatic rolling
        if (!this.gameState.hasRolled) {
            this.socket.emit('roll-dice');
            return;
        }

        // Check if moves are available ONLY if hasRolled is true
        if (this.gameState.hasRolled && (!this.gameState.availableMoves || this.gameState.availableMoves.length === 0)) {
            console.log('🚫 No moves available after rolling. GameState:', this.gameState);
            this.showMessage('Keine Züge mehr verfügbar! Beende deinen Zug.');
            return;
        }

        // Check if player has checkers on bar - BUT only if not already moving from bar
        if (this.gameState.bar[this.playerColor] > 0 && this.selectedPoint !== -1) {
            this.showMessage('Du musst zuerst Steine von der Bar einwürfeln!');
            return;
        }

        if (this.selectedPoint === null) {
            // Select a checker - only if it belongs to the player
            if (this.gameState.board[pointIndex].length > 0 &&
                this.gameState.board[pointIndex][this.gameState.board[pointIndex].length - 1] === this.playerColor) {
                this.selectedPoint = pointIndex;
                this.highlightValidMoves(pointIndex);
            } else {
                this.showMessage('Du kannst nur deine eigenen Steine bewegen!');
            }
        } else if (this.selectedPoint === pointIndex) {
            // Deselect
            this.selectedPoint = null;
            this.clearHighlights();
        } else if (this.selectedPoint === -1) {
            // Moving from bar to board
            const to = pointIndex;

            // Find valid die value for this entry point
            let validDieValue = null;
            for (const dieValue of this.gameState.availableMoves) {
                const entryPoint = this.playerColor === 'white' ? dieValue - 1 : 24 - dieValue;
                console.log(`Checking die ${dieValue}, calculated entry point: ${entryPoint}, target point: ${to}`);
                if (entryPoint === to) {
                    validDieValue = dieValue;
                    break;
                }
            }

            if (validDieValue) {
                // Check if destination is valid (empty, own pieces, or single opponent piece)
                const destCheckers = this.gameState.board[to];
                if (destCheckers.length === 0 ||
                    destCheckers[0] === this.playerColor ||
                    (destCheckers.length === 1 && destCheckers[0] !== this.playerColor)) {

                    this.socket.emit('make-move', {
                        from: -1, // -1 = bar
                        to: to,
                        dieValue: validDieValue
                    });
                } else {
                    this.showMessage('Das Feld ist vom Gegner blockiert!');
                }
            } else {
                this.showMessage('Kein passender Würfel für dieses Feld!');
            }

            this.selectedPoint = null;
            this.clearHighlights();
        } else {
            // Try to move from board to board
            const from = this.selectedPoint;
            const to = pointIndex;

            // Calculate die value based on direction (white moves forward, black backward)
            const direction = this.playerColor === 'white' ? 1 : -1;
            const dieValue = (to - from) * direction;

            // Check if move is valid
            if (dieValue > 0 && this.gameState.availableMoves && this.gameState.availableMoves.includes(dieValue)) {
                // Check if destination is blocked
                const destCheckers = this.gameState.board[to];
                if (destCheckers.length > 1 && destCheckers[0] !== this.playerColor) {
                    this.showMessage('Das Feld ist vom Gegner blockiert!');
                } else {
                    this.socket.emit('make-move', {
                        from: from,
                        to: to,
                        dieValue: dieValue
                    });
                }
            } else {
                this.showMessage('Ungültiger Zug! Prüfe Richtung und verfügbare Würfel.');
            }

            this.selectedPoint = null;
            this.clearHighlights();
        }
    }

    handleBarClick() {
        if (!this.gameState || this.gameState.currentPlayer !== this.playerColor) {
            return;
        }

        // If dice haven't been rolled yet, trigger automatic rolling
        if (!this.gameState.hasRolled) {
            this.socket.emit('roll-dice');
            return;
        }

        if (!this.gameState.availableMoves || this.gameState.availableMoves.length === 0) {
            this.showMessage('Keine Züge mehr verfügbar!');
            return;
        }

        if (this.gameState.bar[this.playerColor] > 0) {
            this.selectedPoint = -1; // -1 represents bar
            this.highlightBarEntryPoints();
        } else {
            this.showMessage('Du hast keine Steine auf der Bar!');
        }
    }

    handleHomeClick() {
        if (!this.gameState || this.gameState.currentPlayer !== this.playerColor) {
            return;
        }

        // If dice haven't been rolled yet, trigger automatic rolling
        if (!this.gameState.hasRolled) {
            this.socket.emit('roll-dice');
            return;
        }

        if (!this.gameState.availableMoves || this.gameState.availableMoves.length === 0) {
            this.showMessage('Keine Züge mehr verfügbar!');
            return;
        }

        if (this.selectedPoint !== null && this.selectedPoint !== -1) {
            // Check if bearing off is allowed
            const canBearOff = this.checkCanBearOff();
            if (canBearOff) {
                const from = this.selectedPoint;
                const exactDistance = this.playerColor === 'white' ? 24 - from : from + 1;

                // Find suitable die (exact match or higher if allowed)
                let selectedDie = null;

                // First try to find exact match
                if (this.gameState.availableMoves.includes(exactDistance)) {
                    selectedDie = exactDistance;
                } else {
                    // Find higher die that can be used
                    for (const die of this.gameState.availableMoves.sort((a, b) => a - b)) {
                        if (die > exactDistance) {
                            // Check if no checkers further back
                            let canUseHigherDie = true;
                            const startCheck = this.playerColor === 'white' ? from + 1 : 0;
                            const endCheck = this.playerColor === 'white' ? 24 : from - 1;

                            for (let i = startCheck; this.playerColor === 'white' ? i < endCheck : i <= endCheck; i++) {
                                if (this.gameState.board[i].some(checker => checker === this.playerColor)) {
                                    canUseHigherDie = false;
                                    break;
                                }
                            }

                            if (canUseHigherDie) {
                                selectedDie = die;
                                break;
                            }
                        }
                    }
                }

                if (selectedDie) {
                    this.socket.emit('make-move', {
                        from: from,
                        to: 25, // 25 = bearing off
                        dieValue: selectedDie
                    });

                    this.selectedPoint = null;
                    this.clearHighlights();
                } else {
                    this.showMessage('Kein passender Würfel für das Abräumen verfügbar!');
                }
            } else {
                this.showMessage('Abräumen nur möglich wenn alle Steine im Home-Bereich sind!');
            }
        } else if (this.selectedPoint === -1) {
            // Selected from bar, try to enter
            for (const dieValue of this.gameState.availableMoves) {
                const entryPoint = this.playerColor === 'white' ? dieValue - 1 : 24 - dieValue;

                if (entryPoint >= 0 && entryPoint < 24) {
                    const destCheckers = this.gameState.board[entryPoint];
                    if (destCheckers.length <= 1 || destCheckers[0] === this.playerColor) {
                        this.socket.emit('make-move', {
                            from: -1, // -1 = bar
                            to: entryPoint,
                            dieValue: dieValue
                        });

                        this.selectedPoint = null;
                        this.clearHighlights();
                        return;
                    }
                }
            }
            this.showMessage('Kein gültiger Einwürfelzug möglich!');
        }
    }

    checkCanBearOff() {
        const homeStart = this.playerColor === 'white' ? 18 : 0;
        const homeEnd = this.playerColor === 'white' ? 24 : 6;

        // Check bar
        if (this.gameState.bar[this.playerColor] > 0) return false;

        // Check all checkers in home
        for (let i = 0; i < 24; i++) {
            if ((this.playerColor === 'white' && i < homeStart) ||
                (this.playerColor === 'black' && i >= homeEnd)) {
                if (this.gameState.board[i].some(checker => checker === this.playerColor)) {
                    return false;
                }
            }
        }

        return true;
    }

    highlightBarEntryPoints() {
        this.clearHighlights();

        if (!this.gameState || !this.gameState.availableMoves) {
            return;
        }

        for (const move of this.gameState.availableMoves) {
            const targetPoint = this.playerColor === 'white' ? move - 1 : 24 - move;

            if (targetPoint >= 0 && targetPoint < 24 && this.isValidMove(-1, targetPoint)) {
                const targetEl = document.querySelector(`[data-point="${targetPoint}"]`);
                if (targetEl) targetEl.classList.add('valid-move');
            }
        }
    }

    isValidMove(from, to) {
        // Simplified validation for highlighting - full validation is done on server
        const destCheckers = this.gameState.board[to] || [];
        if (destCheckers.length <= 1) return true;
        if (destCheckers[0] === this.playerColor) return true;
        return false;
    }

    highlightValidMoves(fromPoint) {
        this.clearHighlights();

        const pointEl = document.querySelector(`[data-point="${fromPoint}"]`);
        if (pointEl) {
            pointEl.classList.add('selected');
        }

        if (!this.gameState || !this.gameState.availableMoves) {
            return;
        }

        this.gameState.availableMoves.forEach(dieValue => {
            let toPoint;
            if (this.playerColor === 'white') {
                toPoint = fromPoint + dieValue;
            } else {
                toPoint = fromPoint - dieValue;
            }

            // Regular moves
            if (toPoint >= 0 && toPoint < 24 && this.isValidMove(fromPoint, toPoint)) {
                const targetEl = document.querySelector(`[data-point="${toPoint}"]`);
                if (targetEl) targetEl.classList.add('valid-move');
            }

            // Bearing off
            if (this.checkCanBearOff()) {
                const exactDistance = this.playerColor === 'white' ? 24 - fromPoint : fromPoint + 1;
                if (dieValue >= exactDistance) {
                    const homeEl = document.getElementById(this.playerColor === 'white' ? 'homeWhite' : 'homeBlack');
                    if (homeEl) homeEl.classList.add('valid-move');
                }
            }
        });
    }

    render() {
        this.renderBoard();
        this.updateCurrentPlayerDisplay();
        this.updateMoveInfo();
    }

    renderBoard() {
        if (!this.gameState) return;

        const boardElement = document.getElementById('board');
        if (!boardElement) return;

        boardElement.innerHTML = '';

        // Obere Reihe (Points 12-23)
        for (let i = 12; i < 18; i++) {
            this.renderPoint(i, 'top', boardElement);
        }

        // Bar (obere Hälfte)
        const barTop = document.createElement('div');
        barTop.className = 'bar';
        barTop.style.gridRow = '1';

        // Add black checkers on bar
        if (this.gameState.bar && this.gameState.bar.black > 0) {
            for (let i = 0; i < this.gameState.bar.black; i++) {
                const checker = this.createChecker('black');
                barTop.appendChild(checker);
            }
        }

        boardElement.appendChild(barTop);

        // Rechte Hälfte (18-23)
        for (let i = 18; i < 24; i++) {
            this.renderPoint(i, 'top', boardElement);
        }

        // Untere Reihe (Points 11-0)
        for (let i = 11; i >= 6; i--) {
            this.renderPoint(i, 'bottom', boardElement);
        }

        // Bar (untere Hälfte)
        const barBottom = document.createElement('div');
        barBottom.className = 'bar';
        barBottom.style.gridRow = '2';

        // Add white checkers on bar
        if (this.gameState.bar && this.gameState.bar.white > 0) {
            for (let i = 0; i < this.gameState.bar.white; i++) {
                const checker = this.createChecker('white');
                barBottom.appendChild(checker);
            }
        }

        boardElement.appendChild(barBottom);

        // Linke Hälfte (5-0)
        for (let i = 5; i >= 0; i--) {
            this.renderPoint(i, 'bottom', boardElement);
        }

        // Update home areas
        this.updateHomeAreas();
        this.updateCurrentPlayerDisplay();
    }

    renderPoint(index, position, container) {
        const point = document.createElement('div');
        point.className = `point ${position}`;
        point.dataset.point = index;

        const checkers = this.gameState.board[index] || [];

        checkers.forEach((checker, checkerIndex) => {
            const checkerEl = this.createChecker(checker);
            point.appendChild(checkerEl);
        });

        container.appendChild(point);
    }

    createChecker(color) {
        const checker = document.createElement('div');
        checker.className = `checker ${color}`;
        return checker;
    }

    updateHomeAreas() {
        const homeWhite = document.getElementById('homeWhite');
        const homeBlack = document.getElementById('homeBlack');

        if (homeWhite && this.gameState.home) {
            const whiteCount = this.gameState.home.white || 0;
            homeWhite.innerHTML = `<div class="home-label">Ziel Weiß</div><div class="home-count">${whiteCount}</div>`;
        }

        if (homeBlack && this.gameState.home) {
            const blackCount = this.gameState.home.black || 0;
            homeBlack.innerHTML = `<div class="home-label">Ziel Schwarz</div><div class="home-count">${blackCount}</div>`;
        }
    }

    updateCurrentPlayerDisplay() {
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl && this.gameState) {
            const currentPlayerName = this.gameState.currentPlayer === 'white' ? 'Weiß' : 'Schwarz';
            const isMyTurn = this.gameState.currentPlayer === this.playerColor;
            currentPlayerEl.textContent = isMyTurn ?
                `Du bist am Zug (${currentPlayerName})` :
                `${currentPlayerName} ist am Zug`;

            // Automatisches Würfeln wenn der Spieler am Zug ist und noch nicht gewürfelt hat
            if (isMyTurn && this.gameState && !this.gameState.hasRolled) {
                setTimeout(() => {
                    // Doppelte Überprüfung vor dem Würfeln
                    if (this.gameState && !this.gameState.hasRolled && this.gameState.currentPlayer === this.playerColor) {
                        this.socket.emit('roll-dice');
                    }
                }, 300);
            }
        }
    }

    showMessage(text) {
        // Create or update message display
        let messageEl = document.querySelector('.game-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.className = 'game-message';
            document.querySelector('.game-info').appendChild(messageEl);
        }

        messageEl.textContent = text;
        messageEl.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.display = 'none';
            }
        }, 3000);
    }

    clearHighlights() {
        document.querySelectorAll('.point, .home').forEach(el => {
            el.classList.remove('selected', 'valid-move');
        });
    }
}
