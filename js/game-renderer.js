// Shared Rendering Functions for Backgammon Game
class GameRenderer {
    static renderBoard(gameInstance) {
        const boardElement = document.getElementById('board');
        if (!boardElement) return;

        boardElement.innerHTML = '';

        // Get board state - different structure for single vs multiplayer
        const board = gameInstance.board || gameInstance.gameState?.board;
        const bar = gameInstance.bar || gameInstance.gameState?.bar;
        const selectedPoint = gameInstance.selectedPoint;

        if (!board || !bar) return;

        // Obere Reihe (Points 12-23)
        for (let i = 12; i < 18; i++) {
            this.renderPoint(i, 'top', boardElement, board, selectedPoint, gameInstance);
        }

        // Bar (obere Hälfte)
        const barTop = document.createElement('div');
        barTop.className = 'bar';
        barTop.style.gridRow = '1';

        // Add black checkers on bar
        if (bar.black > 0) {
            for (let i = 0; i < bar.black; i++) {
                const checker = this.createChecker('black', gameInstance);
                barTop.appendChild(checker);
            }
        }

        barTop.addEventListener('click', () => {
            const currentPlayer = gameInstance.currentPlayer || gameInstance.gameState?.currentPlayer;
            if (bar[currentPlayer] > 0 && currentPlayer === 'black') {
                gameInstance.handleBarClick();
            }
        });

        boardElement.appendChild(barTop);

        // Rechte Hälfte (18-23)
        for (let i = 18; i < 24; i++) {
            this.renderPoint(i, 'top', boardElement, board, selectedPoint, gameInstance);
        }

        // Untere Reihe (Points 11-0)
        for (let i = 11; i >= 6; i--) {
            this.renderPoint(i, 'bottom', boardElement, board, selectedPoint, gameInstance);
        }

        // Bar (untere Hälfte)
        const barBottom = document.createElement('div');
        barBottom.className = 'bar';
        barBottom.style.gridRow = '2';

        // Add white checkers on bar
        if (bar.white > 0) {
            for (let i = 0; i < bar.white; i++) {
                const checker = this.createChecker('white', gameInstance);
                barBottom.appendChild(checker);
            }
        }

        barBottom.addEventListener('click', () => {
            const currentPlayer = gameInstance.currentPlayer || gameInstance.gameState?.currentPlayer;
            if (bar[currentPlayer] > 0 && currentPlayer === 'white') {
                gameInstance.handleBarClick();
            }
        });

        boardElement.appendChild(barBottom);

        // Rechte Hälfte (5-0)
        for (let i = 5; i >= 0; i--) {
            this.renderPoint(i, 'bottom', boardElement, board, selectedPoint, gameInstance);
        }

        // Home-Bereiche rendern
        this.renderHome(gameInstance);
    }

    static renderPoint(index, position, container, board, selectedPoint, gameInstance) {
        const point = document.createElement('div');
        point.className = `point ${position}`;
        point.dataset.point = index;

        if (selectedPoint === index) {
            point.classList.add('selected');
        }

        const checkers = board[index] || [];
        const maxVisible = 5;

        checkers.forEach((color, i) => {
            if (i < maxVisible) {
                const checker = this.createChecker(color, gameInstance);
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

    static renderHome(gameInstance) {
        const homeWhite = document.getElementById('homeWhite');
        const homeBlack = document.getElementById('homeBlack');

        if (!homeWhite || !homeBlack) return;

        const home = gameInstance.home || gameInstance.gameState?.home;
        if (!home) return;

        // Update counters
        const whiteCountEl = homeWhite.querySelector('.home-count');
        const blackCountEl = homeBlack.querySelector('.home-count');

        if (whiteCountEl) whiteCountEl.textContent = home.white;
        if (blackCountEl) blackCountEl.textContent = home.black;

        // Visual representation of checkers in home
        const whiteCheckersContainer = homeWhite.querySelector('.home-checkers') || document.createElement('div');
        const blackCheckersContainer = homeBlack.querySelector('.home-checkers') || document.createElement('div');

        if (!homeWhite.querySelector('.home-checkers')) {
            whiteCheckersContainer.className = 'home-checkers';
            homeWhite.appendChild(whiteCheckersContainer);
        }
        if (!homeBlack.querySelector('.home-checkers')) {
            blackCheckersContainer.className = 'home-checkers';
            homeBlack.appendChild(blackCheckersContainer);
        }

        whiteCheckersContainer.innerHTML = '';
        blackCheckersContainer.innerHTML = '';

        const maxVisible = 5;

        // Show white checkers in home
        for (let i = 0; i < Math.min(home.white, maxVisible); i++) {
            const checker = this.createChecker('white', gameInstance);
            checker.style.width = '18px';
            checker.style.height = '18px';
            checker.style.margin = '1px';
            whiteCheckersContainer.appendChild(checker);
        }

        // Show black checkers in home
        for (let i = 0; i < Math.min(home.black, maxVisible); i++) {
            const checker = this.createChecker('black', gameInstance);
            checker.style.width = '18px';
            checker.style.height = '18px';
            checker.style.margin = '1px';
            blackCheckersContainer.appendChild(checker);
        }

        // Add event listeners for bearing off
        homeWhite.onclick = () => {
            if (gameInstance.handleHomeClick) {
                gameInstance.handleHomeClick('white');
            }
        };
        homeBlack.onclick = () => {
            if (gameInstance.handleHomeClick) {
                gameInstance.handleHomeClick('black');
            }
        };
    }

    static createChecker(color, gameInstance) {
        const checker = document.createElement('div');
        checker.className = `checker ${color}`;

        // Determine if checker should be draggable
        const currentPlayer = gameInstance.currentPlayer || gameInstance.gameState?.currentPlayer;
        const hasRolled = gameInstance.hasRolled !== undefined ? gameInstance.hasRolled : gameInstance.gameState?.hasRolled;

        if (color === currentPlayer && hasRolled) {
            checker.classList.add('draggable');
        }

        return checker;
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

    static clearHighlights() {
        document.querySelectorAll('.point, .home').forEach(el => {
            el.classList.remove('selected', 'valid-move');
        });
    }
}
