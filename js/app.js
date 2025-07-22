// Main Application Controller - Handles menu navigation and game mode selection

class BackgammonApp {
    constructor() {
        this.gameMode = null; // 'single' or 'multiplayer'
        this.singlePlayerGame = null;
        this.multiPlayerGame = null;

        this.setupMenuEvents();
        this.showMenu();
    }

    setupMenuEvents() {
        document.getElementById('singleplayerBtn').addEventListener('click', () => {
            this.startSinglePlayer();
        });

        document.getElementById('multiplayerBtn').addEventListener('click', () => {
            this.showMultiplayerLobby();
        });

        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showMenu();
        });

        document.getElementById('gameMenuBtn').addEventListener('click', () => {
            this.showMenu();
        });
    }

    showMenu() {
        document.getElementById('menuScreen').style.display = 'flex';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'none';
        document.getElementById('connectionStatus').style.display = 'none';
        document.getElementById('playerInfo').style.display = 'flex';

        // Cleanup games
        if (this.multiPlayerGame && this.multiPlayerGame.socket) {
            this.multiPlayerGame.socket.disconnect();
        }
        this.gameMode = null;
        this.singlePlayerGame = null;
        this.multiPlayerGame = null;
    }

    startSinglePlayer() {
        this.gameMode = 'single';
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        document.getElementById('connectionStatus').style.display = 'none';
        document.getElementById('playerInfo').style.display = 'none';

        // Initialize single player game
        this.singlePlayerGame = new SinglePlayerBackgammon();
    }

    showMultiplayerLobby() {
        this.gameMode = 'multiplayer';
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'flex';
        document.getElementById('gameContainer').style.display = 'none';

        // Initialize multiplayer game
        this.multiPlayerGame = new MultiplayerBackgammon(this);
    }

    showMultiplayerGame() {
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';
        document.getElementById('connectionStatus').style.display = 'block';
        document.getElementById('playerInfo').style.display = 'flex';
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BackgammonApp();

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Prevent scrolling
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
});
