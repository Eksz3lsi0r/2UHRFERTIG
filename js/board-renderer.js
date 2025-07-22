// Board Rendering and UI Helper Functions

class BoardRenderer {
    static render(gameState, selectedPoint = null, playerColor = null) {
        const boardElement = document.getElementById('board');
        if (!boardElement || !gameState) return;

        boardElement.innerHTML = '';

        // Obere Reihe (Points 12-23)
        for (let i = 12; i < 18; i++) {
            this.renderPoint(i, 'top', boardElement, gameState, selectedPoint);
        }

        // Bar (obere Hälfte)
        const barTop = document.createElement('div');
        barTop.className = 'bar';
        barTop.style.gridRow = '1';

        // Add black checkers on bar
        if (gameState.bar && gameState.bar.black > 0) {
            for (let i = 0; i < gameState.bar.black; i++) {
                const checker = this.createChecker('black', gameState, playerColor);
                barTop.appendChild(checker);
            }
        }

        boardElement.appendChild(barTop);

        // Rechte Hälfte (18-23)
        for (let i = 18; i < 24; i++) {
            this.renderPoint(i, 'top', boardElement, gameState, selectedPoint);
        }

        // Untere Reihe (Points 11-0)
        for (let i = 11; i >= 6; i--) {
            this.renderPoint(i, 'bottom', boardElement, gameState, selectedPoint);
        }

        // Bar (untere Hälfte)
        const barBottom = document.createElement('div');
        barBottom.className = 'bar';
        barBottom.style.gridRow = '2';

        // Add white checkers on bar
        if (gameState.bar && gameState.bar.white > 0) {
            for (let i = 0; i < gameState.bar.white; i++) {
                const checker = this.createChecker('white', gameState, playerColor);
                barBottom.appendChild(checker);
            }
        }

        boardElement.appendChild(barBottom);

        // Rechte Hälfte (5-0)
        for (let i = 5; i >= 0; i--) {
            this.renderPoint(i, 'bottom', boardElement, gameState, selectedPoint);
        }
    }

    static renderPoint(index, position, container, gameState, selectedPoint = null) {
        const point = document.createElement('div');
        point.className = `point ${position}`;
        point.dataset.point = index;

        if (selectedPoint === index) {
            point.classList.add('selected');
        }

        const checkers = gameState.board[index] || [];
        const maxVisible = 5;

        checkers.forEach((color, i) => {
            if (i < maxVisible) {
                const checker = this.createChecker(color, gameState);
                point.appendChild(checker);
            }
        });

        if (checkers.length > maxVisible) {
            const counter = document.createElement('div');
            counter.className = 'counter';
            counter.textContent = checkers.length;
            point.appendChild(counter);
        }

        container.appendChild(point);
    }

    static renderHome(gameState, selectedPoint = null, playerColor = null) {
        const homeWhite = document.getElementById('homeWhite');
        const homeBlack = document.getElementById('homeBlack');

        if (!homeWhite || !homeBlack || !gameState) return;

        // Update counters
        const whiteCountEl = homeWhite.querySelector('.home-count');
        const blackCountEl = homeBlack.querySelector('.home-count');

        if (whiteCountEl && gameState.home) whiteCountEl.textContent = gameState.home.white || 0;
        if (blackCountEl && gameState.home) blackCountEl.textContent = gameState.home.black || 0;

        // Visual representation of checkers in home
        this.renderHomeCheckers(homeWhite, gameState.home?.white || 0, 'white');
        this.renderHomeCheckers(homeBlack, gameState.home?.black || 0, 'black');

        // Highlight valid moves for bearing off
        if (selectedPoint !== null && playerColor) {
            const canBearOff = BackgammonRules.canBearOff(gameState.board, gameState.bar, playerColor);
            if (canBearOff) {
                const validMoves = BackgammonRules.getValidMoves(
                    gameState.board,
                    gameState.bar,
                    gameState.availableMoves,
                    selectedPoint,
                    playerColor
                );

                if (validMoves.includes('home')) {
                    if (playerColor === 'white') {
                        homeWhite.classList.add('valid-move');
                    } else {
                        homeBlack.classList.add('valid-move');
                    }
                }
            }
        }
    }

    static renderHomeCheckers(homeElement, count, color) {
        let checkersContainer = homeElement.querySelector('.home-checkers');

        if (!checkersContainer) {
            checkersContainer = document.createElement('div');
            checkersContainer.className = 'home-checkers';
            homeElement.appendChild(checkersContainer);
        }

        checkersContainer.innerHTML = '';

        const maxVisible = 5;

        // Show checkers in home
        for (let i = 0; i < Math.min(count, maxVisible); i++) {
            const checker = this.createChecker(color);
            checker.style.width = '18px';
            checker.style.height = '18px';
            checker.style.margin = '1px';
            checkersContainer.appendChild(checker);
        }
    }

    static createChecker(color, gameState = null, playerColor = null) {
        const checker = document.createElement('div');
        checker.className = `checker ${color}`;

        if (gameState && playerColor && color === playerColor && gameState.hasRolled) {
            checker.classList.add('draggable');
        }

        return checker;
    }

    static highlightValidMoves(fromPoint, gameState, playerColor) {
        this.clearHighlights();

        // Highlight selected point
        const pointEl = document.querySelector(`[data-point="${fromPoint}"]`);
        if (pointEl) {
            pointEl.classList.add('selected');
        }

        if (!gameState || !gameState.availableMoves || !playerColor) return;

        if (fromPoint === -1) {
            // Highlighting for bar entry
            this.highlightBarEntryPoints(gameState, playerColor);
        } else {
            // Regular move highlighting
            const validMoves = BackgammonRules.getValidMoves(
                gameState.board,
                gameState.bar,
                gameState.availableMoves,
                fromPoint,
                playerColor
            );

            validMoves.forEach(move => {
                if (move === 'home') {
                    const homeEl = document.getElementById(playerColor === 'white' ? 'homeWhite' : 'homeBlack');
                    if (homeEl) homeEl.classList.add('valid-move');
                } else {
                    const targetEl = document.querySelector(`[data-point="${move}"]`);
                    if (targetEl) targetEl.classList.add('valid-move');
                }
            });
        }
    }

    static highlightBarEntryPoints(gameState, playerColor) {
        if (!gameState || !gameState.availableMoves) return;

        for (const move of gameState.availableMoves) {
            const targetPoint = playerColor === 'white' ? 24 - move : move - 1;

            if (targetPoint >= 0 && targetPoint < 24 &&
                BackgammonRules.canMoveTo(gameState.board, targetPoint, playerColor)) {
                const targetEl = document.querySelector(`[data-point="${targetPoint}"]`);
                if (targetEl) targetEl.classList.add('valid-move');
            }
        }
    }

    static clearHighlights() {
        document.querySelectorAll('.point, .home').forEach(el => {
            el.classList.remove('selected', 'valid-move');
        });
    }

    static showMessage(text) {
        const existing = document.querySelector('.message');
        if (existing) existing.remove();

        const message = document.createElement('div');
        message.className = 'message';
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => message.remove(), 2500);
    }

    static updateMoveInfo(availableMoves) {
        const moveInfo = document.getElementById('moveInfo');
        if (!moveInfo) return;

        if (availableMoves && availableMoves.length > 0) {
            moveInfo.textContent = `Verfügbare Züge: ${availableMoves.join(', ')}`;
        } else {
            moveInfo.textContent = '';
        }
    }

    static updateCurrentPlayer(currentPlayer) {
        const currentPlayerEl = document.getElementById('currentPlayer');
        if (currentPlayerEl) {
            currentPlayerEl.textContent = `${currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} ist am Zug`;
        }
    }

    static animateDice(die1Value, die2Value) {
        const die1 = document.getElementById('die1');
        const die2 = document.getElementById('die2');

        if (!die1 || !die2) return;

        die1.classList.add('rolling');
        die2.classList.add('rolling');

        return new Promise(resolve => {
            setTimeout(() => {
                die1.textContent = die1Value;
                die2.textContent = die2Value;
                die1.classList.remove('rolling');
                die2.classList.remove('rolling');
                resolve();
            }, 500);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardRenderer;
}
