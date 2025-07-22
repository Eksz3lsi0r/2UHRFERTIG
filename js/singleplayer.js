// Single Player Game Class - Handles all single player game logic

class SinglePlayerBackgammon {
    constructor() {
        this.board = Array(24).fill(null).map(() => []);
        this.bar = { white: 0, black: 0 };
        this.home = { white: 0, black: 0 };
        this.currentPlayer = 'white';
        this.dice = [];
        this.availableMoves = [];
        this.selectedPoint = null;
        this.hasRolled = false;
        this.movesMade = 0;
        this.touchStartPoint = null;
        this.gameOver = false;

        this.initializeBoard();
        this.setupEventListeners();
        this.render();

        // Start first turn with automatic dice roll
        setTimeout(() => {
            this.updateCurrentPlayer();
        }, 100);
    }

    initializeBoard() {
        // Standard Backgammon Startposition
        this.board[0] = ['white', 'white'];
        this.board[5] = ['black', 'black', 'black', 'black', 'black'];
        this.board[7] = ['black', 'black', 'black'];
        this.board[11] = ['white', 'white', 'white', 'white', 'white'];
        this.board[12] = ['black', 'black', 'black', 'black', 'black'];
        this.board[16] = ['white', 'white', 'white'];
        this.board[18] = ['white', 'white', 'white', 'white', 'white'];
        this.board[23] = ['black', 'black'];

        // Initialize home areas with labels and counters
        const homeWhite = document.getElementById('homeWhite');
        const homeBlack = document.getElementById('homeBlack');

        if (homeWhite) {
            homeWhite.innerHTML = '<div class="home-label">Ziel Weiß</div><div class="home-count">0</div>';
        }
        if (homeBlack) {
            homeBlack.innerHTML = '<div class="home-label">Ziel Schwarz</div><div class="home-count">0</div>';
        }
    }

    setupEventListeners() {
        // Touch Events für bessere Mobile-Unterstützung
        document.getElementById('board').addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.touchStartPoint = this.getPointFromTouch(touch);
        }, { passive: false });

        document.getElementById('board').addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.touchStartPoint !== null) {
                this.handlePointClick(this.touchStartPoint);
                this.touchStartPoint = null;
            }
        }, { passive: false });

        // Mouse Events als Fallback
        document.getElementById('board').addEventListener('click', (e) => {
            const point = this.getPointFromClick(e);
            if (point !== null) {
                this.handlePointClick(point);
            }
        });
    }

    getPointFromTouch(touch) {
        const board = document.getElementById('board');
        const rect = board.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const points = board.querySelectorAll('.point');
        for (let i = 0; i < points.length; i++) {
            const pointRect = points[i].getBoundingClientRect();
            if (x >= pointRect.left - rect.left &&
                x <= pointRect.right - rect.left &&
                y >= pointRect.top - rect.top &&
                y <= pointRect.bottom - rect.top) {
                return parseInt(points[i].dataset.point);
            }
        }
        return null;
    }

    getPointFromClick(e) {
        const point = e.target.closest('.point');
        if (point) {
            return parseInt(point.dataset.point);
        }
        return null;
    }

    rollDice() {
        if (this.hasRolled) return;

        const die1 = document.getElementById('die1');
        const die2 = document.getElementById('die2');

        die1.classList.add('rolling');
        die2.classList.add('rolling');

        setTimeout(() => {
            const roll1 = Math.floor(Math.random() * 6) + 1;
            const roll2 = Math.floor(Math.random() * 6) + 1;

            this.dice = roll1 === roll2 ? [roll1, roll1, roll1, roll1] : [roll1, roll2];
            this.availableMoves = [...this.dice];
            this.hasRolled = true;

            die1.textContent = roll1;
            die2.textContent = roll2;
            die1.classList.remove('rolling');
            die2.classList.remove('rolling');

            this.updateMoveInfo();
            this.updateButtons();

            if (roll1 === roll2) {
                this.showMessage(`Pasch! ${roll1}er Pasch gewürfelt!`);
            }

            // Debug: Log available moves and check
            console.log('Available moves:', this.availableMoves);
            console.log('Has valid moves:', this.hasAnyValidMoves());

            // In multiplayer mode, let the server handle automatic turn ending
            if (this.socket) {
                // Server will handle turn ending automatically when no moves are available
                return;
            }

            // Only show "no moves" after a slight delay to ensure everything is set up (single-player only)
            setTimeout(() => {
                if (!this.hasAnyValidMoves() && this.availableMoves.length > 0) {
                    this.showMessage('Keine Züge möglich! Zug wird automatisch beendet.');
                    setTimeout(() => this.endTurn(), 2000);
                }
            }, 100);
        }, 500);
    }

    canBearOff(player) {
        const homeStart = player === 'white' ? 18 : 0;
        const homeEnd = player === 'white' ? 24 : 6;

        // Check bar
        if (this.bar[player] > 0) return false;

        for (let i = 0; i < 24; i++) {
            if ((player === 'white' && i < homeStart) ||
                (player === 'black' && i >= homeEnd)) {
                if (this.board[i].some(checker => checker === player)) {
                    return false;
                }
            }
        }

        return true;
    }

    getValidMoves(fromPoint) {
        const validMoves = [];
        const player = this.currentPlayer;

        if (this.bar[player] > 0) {
            if (fromPoint !== 'bar') return [];

            for (const move of this.availableMoves) {
                const targetPoint = player === 'white' ? 24 - move : move - 1;
                if (this.canMoveTo(targetPoint, player)) {
                    validMoves.push(targetPoint);
                }
            }
            return validMoves;
        }

        if (fromPoint === 'bar') return [];

        const direction = player === 'white' ? 1 : -1;

        for (const move of this.availableMoves) {
            const targetPoint = fromPoint + (move * direction);

            if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, player)) {
                validMoves.push(targetPoint);
            }

            if (this.canBearOff(player)) {
                const exactDistance = player === 'white' ? 24 - fromPoint : fromPoint + 1;

                for (const move of this.availableMoves) {
                    if (move === exactDistance) {
                        validMoves.push('home');
                        break;
                    }
                    // Can use higher die if no checkers further back
                    else if (move > exactDistance) {
                        let canUseHigherDie = true;
                        const startCheck = player === 'white' ? fromPoint + 1 : 0;
                        const endCheck = player === 'white' ? 24 : fromPoint - 1;

                        for (let i = startCheck; player === 'white' ? i < endCheck : i <= endCheck; i++) {
                            if (this.board[i].some(checker => checker === player)) {
                                canUseHigherDie = false;
                                break;
                            }
                        }

                        if (canUseHigherDie) {
                            validMoves.push('home');
                            break;
                        }
                    }
                }
            }
        }

        return validMoves;
    }

    canMoveTo(point, player) {
        if (point < 0 || point >= 24) return false;
        const pointCheckers = this.board[point];
        if (pointCheckers.length === 0) return true;
        if (pointCheckers[0] === player) return true;
        if (pointCheckers.length === 1) return true; // Can hit single opponent checker
        return false;
    }

    makeMove(from, to, dieValue = null) {
        const player = this.currentPlayer;
        let moveDistance;

        if (from === -1) { // Moving from bar
            this.bar[player]--;

            // Hit opponent if single checker
            if (this.board[to].length === 1 && this.board[to][0] !== player) {
                const hitChecker = this.board[to][0];
                this.board[to] = []; // Remove opponent checker
                this.bar[hitChecker]++; // Add to opponent's bar
                this.showMessage(`${hitChecker === 'white' ? 'Weißer' : 'Schwarzer'} Stein geschlagen!`);
            }

            this.board[to].push(player);
            moveDistance = dieValue;
        } else if (to === 'home') {
            const checker = this.board[from].pop();
            this.home[player]++;

            // Calculate actual distance for bear off
            const actualDistance = player === 'white' ? 24 - from : from + 1;

            // Use exact die or find higher die that can be used
            if (dieValue && this.availableMoves.includes(dieValue)) {
                moveDistance = dieValue;
            } else {
                // Find minimum suitable die
                moveDistance = this.availableMoves.find(die => die >= actualDistance) || actualDistance;
            }

            if (this.home[player] === 15) {
                setTimeout(() => {
                    this.showMessage(`${player === 'white' ? 'Weiß' : 'Schwarz'} hat gewonnen! 🎉`);
                    this.gameOver = true;
                    this.updateButtons();
                }, 500);
            }
        } else {
            const checker = this.board[from].pop();

            if (this.board[to].length === 1 && this.board[to][0] !== player) {
                const hitChecker = this.board[to][0];
                this.board[to] = []; // Remove opponent checker
                this.bar[hitChecker]++; // Add to opponent's bar
                this.showMessage(`${hitChecker === 'white' ? 'Weißer' : 'Schwarzer'} Stein geschlagen!`);
            }

            this.board[to].push(checker);
            moveDistance = dieValue || Math.abs(to - from);
        }

        const moveIndex = this.availableMoves.indexOf(moveDistance);
        if (moveIndex > -1) {
            this.availableMoves.splice(moveIndex, 1);
        }

        this.movesMade++;
        this.selectedPoint = null;
        this.clearHighlights();
        this.render();
        this.updateMoveInfo();

        if (this.availableMoves.length === 0) {
            // All dice used
            if (this.socket) {
                // Server will handle turn ending automatically
                this.showMessage('Alle Würfel verwendet. Zug wird beendet.');
            } else {
                // End turn automatically in single-player mode
                setTimeout(() => this.endTurn(), 1000);
            }
        } else if (!this.hasAnyValidMoves()) {
            // No more valid moves possible
            if (this.socket) {
                // Server will handle turn ending automatically
                this.showMessage('Keine weiteren Züge möglich!');
            } else {
                // End turn automatically in single-player mode
                setTimeout(() => {
                    this.showMessage('Keine weiteren Züge möglich!');
                    setTimeout(() => this.endTurn(), 1500);
                }, 500);
            }
        }
    }

    highlightValidMoves(fromPoint) {
        this.clearHighlights();

        // Highlight selected point
        const pointEl = document.querySelector(`[data-point="${fromPoint}"]`);
        if (pointEl) {
            pointEl.classList.add('selected');
        }

        // Highlight valid destination points
        if (fromPoint === -1) { // From bar
            for (const move of this.availableMoves) {
                const targetPoint = this.currentPlayer === 'white' ? 24 - move : move - 1;
                if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, this.currentPlayer)) {
                    const targetEl = document.querySelector(`[data-point="${targetPoint}"]`);
                    if (targetEl) targetEl.classList.add('valid-move');
                }
            }
        } else {
            const direction = this.currentPlayer === 'white' ? 1 : -1;

            for (const move of this.availableMoves) {
                const targetPoint = fromPoint + (move * direction);

                // Regular moves
                if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, this.currentPlayer)) {
                    const targetEl = document.querySelector(`[data-point="${targetPoint}"]`);
                    if (targetEl) targetEl.classList.add('valid-move');
                }

                // Bearing off
                if (this.checkCanBearOff()) {
                    const exactDistance = this.currentPlayer === 'white' ? 24 - fromPoint : fromPoint + 1;

                    if (move === exactDistance) {
                        const homeEl = document.getElementById(this.currentPlayer === 'white' ? 'homeWhite' : 'homeBlack');
                        if (homeEl) homeEl.classList.add('valid-move');
                    }
                    // Can use higher die if no checkers further back
                    else if (move > exactDistance) {
                        let canUseHigherDie = true;
                        const startCheck = this.currentPlayer === 'white' ? fromPoint + 1 : 0;
                        const endCheck = this.currentPlayer === 'white' ? 24 : fromPoint - 1;

                        for (let i = startCheck; this.currentPlayer === 'white' ? i < endCheck : i <= endCheck; i++) {
                            if (this.board[i].some(checker => checker === this.currentPlayer)) {
                                canUseHigherDie = false;
                                break;
                            }
                        }

                        if (canUseHigherDie) {
                            const homeEl = document.getElementById(this.currentPlayer === 'white' ? 'homeWhite' : 'homeBlack');
                            if (homeEl) homeEl.classList.add('valid-move');
                        }
                    }
                }
            }
        }
    }

    highlightBarEntryPoints() {
        this.clearHighlights();

        for (const move of this.availableMoves) {
            const targetPoint = this.currentPlayer === 'white' ? 24 - move : move - 1;
            if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, this.currentPlayer)) {
                const targetEl = document.querySelector(`[data-point="${targetPoint}"]`);
                if (targetEl) targetEl.classList.add('valid-move');
            }
        }
    }

    clearHighlights() {
        GameRenderer.clearHighlights();
    }

    hasAnyValidMoves() {
        if (this.bar[this.currentPlayer] > 0) {
            // Must enter from bar first
            for (const move of this.availableMoves) {
                const targetPoint = this.currentPlayer === 'white' ? 24 - move : move - 1;
                if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, this.currentPlayer)) {
                    return true;
                }
            }
            return false;
        }

        for (let i = 0; i < 24; i++) {
            if (this.board[i].length > 0 && this.board[i][this.board[i].length - 1] === this.currentPlayer) {
                const direction = this.currentPlayer === 'white' ? 1 : -1;

                for (const move of this.availableMoves) {
                    const targetPoint = i + (move * direction);

                    // Regular move
                    if (targetPoint >= 0 && targetPoint < 24 && this.canMoveTo(targetPoint, this.currentPlayer)) {
                        return true;
                    }

                    // Bearing off
                    if (this.canBearOff(this.currentPlayer)) {
                        const exactDistance = this.currentPlayer === 'white' ? 24 - i : i + 1;
                        if (move === exactDistance) {
                            return true;
                        }
                        // Can use higher die if no checkers further back
                        if (move > exactDistance) {
                            let canUseHigherDie = true;
                            const startCheck = this.currentPlayer === 'white' ? i + 1 : 0;
                            const endCheck = this.currentPlayer === 'white' ? 24 : i - 1;

                            for (let j = startCheck; this.currentPlayer === 'white' ? j < endCheck : j <= endCheck; j++) {
                                if (this.board[j].some(checker => checker === this.currentPlayer)) {
                                    canUseHigherDie = false;
                                    break;
                                }
                            }

                            if (canUseHigherDie) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    handlePointClick(pointIndex) {
        if (this.gameOver) return;

        // If dice haven't been rolled yet, roll them automatically first
        if (!this.hasRolled) {
            this.rollDice();
            return;
        }

        // Check if player has checkers on bar - BUT only if not already moving from bar
        if (this.bar[this.currentPlayer] > 0 && this.selectedPoint !== -1) {
            this.showMessage('Zuerst müssen Steine von der Bar eingewürfelt werden!');
            return;
        }

        if (this.selectedPoint === null) {
            // Select a checker - only if it belongs to current player
            if (this.board[pointIndex].length > 0 &&
                this.board[pointIndex][this.board[pointIndex].length - 1] === this.currentPlayer) {

                // Check if this point has valid moves before selecting
                const validMoves = this.getValidMoves(pointIndex);
                if (validMoves.length === 0) {
                    this.showMessage('Keine gültigen Züge von diesem Punkt möglich!');
                    return;
                }

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
            for (const dieValue of this.availableMoves) {
                const entryPoint = this.currentPlayer === 'white' ? 24 - dieValue : dieValue - 1;
                if (entryPoint === to) {
                    validDieValue = dieValue;
                    break;
                }
            }

            if (validDieValue) {
                // Check if destination is valid (empty, own pieces, or single opponent piece)
                const destCheckers = this.board[to];
                if (destCheckers.length === 0 ||
                    destCheckers[0] === this.currentPlayer ||
                    (destCheckers.length === 1 && destCheckers[0] !== this.currentPlayer)) {

                    this.makeMove(-1, to, validDieValue);
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
            const direction = this.currentPlayer === 'white' ? 1 : -1;
            const dieValue = (to - from) * direction;

            // Check if move is valid
            if (dieValue > 0 && this.availableMoves.includes(dieValue)) {
                // Check if destination is blocked
                const destCheckers = this.board[to];
                if (destCheckers.length > 1 && destCheckers[0] !== this.currentPlayer) {
                    this.showMessage('Das Feld ist vom Gegner blockiert!');
                } else {
                    this.makeMove(from, to, dieValue);
                }
            } else {
                this.showMessage('Ungültiger Zug! Prüfe Richtung und verfügbare Würfel.');
            }

            this.selectedPoint = null;
            this.clearHighlights();
        }
    }

    handleBarClick() {
        if (this.gameOver) return;

        // If dice haven't been rolled yet, roll them automatically first
        if (!this.hasRolled) {
            this.rollDice();
            return;
        }

        if (this.bar[this.currentPlayer] > 0) {
            this.selectedPoint = -1; // -1 represents bar
            this.highlightBarEntryPoints();
        }
    }

    handleHomeClick(color) {
        if (this.gameOver) return;

        // If dice haven't been rolled yet, roll them automatically first
        if (!this.hasRolled) {
            this.rollDice();
            return;
        }

        if (color !== this.currentPlayer) {
            this.showMessage('Nicht dein Zielbereich!');
            return;
        }

        if (this.selectedPoint !== null && this.selectedPoint !== -1) {
            // Check if bearing off is allowed
            const canBearOff = this.checkCanBearOff();
            if (!canBearOff) {
                this.showMessage('Du kannst noch nicht abtragen! Alle Steine müssen im Heimfeld sein.');
                return;
            }

            const from = this.selectedPoint;
            const exactDistance = this.currentPlayer === 'white' ? 24 - from : from + 1;

            // Find suitable die - exact match first, then higher
            let selectedDie = null;

            // Try exact match first
            for (const die of this.availableMoves) {
                if (die === exactDistance) {
                    selectedDie = die;
                    break;
                }
            }

            // If no exact match, check if can use higher die
            if (!selectedDie) {
                for (const die of this.availableMoves) {
                    if (die > exactDistance) {
                        // Check if no checkers further back (only for higher die usage)
                        let canUseHigherDie = true;
                        const startCheck = this.currentPlayer === 'white' ? from + 1 : 0;
                        const endCheck = this.currentPlayer === 'white' ? 24 : from - 1;

                        for (let i = startCheck; this.currentPlayer === 'white' ? i < endCheck : i <= endCheck; i++) {
                            if (this.board[i].some(checker => checker === this.currentPlayer)) {
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
                this.makeMove(from, 'home', selectedDie);
            } else {
                this.showMessage('Kein passender Würfel für diesen Abtrag!');
            }
        } else {
            this.showMessage('Wähle zuerst einen Stein aus deinem Heimfeld!');
        }
    }

    checkCanBearOff() {
        const homeStart = this.currentPlayer === 'white' ? 18 : 0;
        const homeEnd = this.currentPlayer === 'white' ? 24 : 6;

        // Check bar
        if (this.bar[this.currentPlayer] > 0) return false;

        // Check all checkers in home
        for (let i = 0; i < 24; i++) {
            if ((this.currentPlayer === 'white' && i < homeStart) ||
                (this.currentPlayer === 'black' && i >= homeEnd)) {
                if (this.board[i].some(checker => checker === this.currentPlayer)) {
                    return false;
                }
            }
        }

        return true;
    }

    endTurn() {
        if (!this.hasRolled || this.gameOver) return;

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.dice = [];
        this.availableMoves = [];
        this.hasRolled = false;
        this.movesMade = 0;
        this.selectedPoint = null;

        this.updateCurrentPlayer();
        this.render();
        this.updateButtons();
        this.updateMoveInfo();
    }

    updateCurrentPlayer() {
        document.getElementById('currentPlayer').textContent =
            `${this.currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} ist am Zug`;

        // Automatisches Würfeln beim Spielerwechsel
        if (!this.hasRolled && !this.gameOver) {
            // Sehr kurzes Delay für bessere UX
            setTimeout(() => {
                if (!this.hasRolled && !this.gameOver) {
                    this.rollDice();
                }
            }, 200);
        }
    }

    updateMoveInfo() {
        const moveInfo = document.getElementById('moveInfo');
        if (this.availableMoves.length > 0) {
            moveInfo.textContent = `Verfügbare Züge: ${this.availableMoves.join(', ')}`;
        } else {
            moveInfo.textContent = '';
        }
    }

    updateButtons() {
        // Würfel-Button wurde entfernt - automatisches Würfeln implementiert
    }

    render() {
        this.renderBoard();
    }

    renderBoard() {
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
        if (this.bar.black > 0) {
            for (let i = 0; i < this.bar.black; i++) {
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
        if (this.bar.white > 0) {
            for (let i = 0; i < this.bar.white; i++) {
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

        const checkers = this.board[index] || [];

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

        if (homeWhite) {
            homeWhite.innerHTML = `<div class="home-label">Ziel Weiß</div><div class="home-count">${this.home.white}</div>`;
        }

        if (homeBlack) {
            homeBlack.innerHTML = `<div class="home-label">Ziel Schwarz</div><div class="home-count">${this.home.black}</div>`;
        }
    }

    updateCurrentPlayerDisplay() {
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl) {
            const currentPlayerName = this.currentPlayer === 'white' ? 'Weiß' : 'Schwarz';
            currentPlayerEl.textContent = `${currentPlayerName} ist am Zug`;
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
