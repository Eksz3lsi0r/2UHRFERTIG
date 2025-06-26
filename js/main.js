// Main Game Script
// Game State
const gameState = {
    coins: 1000,
    startLevel: 1,
    talentpoints: 1,
    allocatedTalents: 0,
    enemyHealthMultiplier: 1,
    inMenu: true,
    paused: false,
    gameOver: false,
    victory: false,
    characterWindowOpen: false,
    talentsWindowOpen: false,
    distance: 0,
    enemyKills: 0,
    backgroundOffset: 0,
    cameraOffset: { x: 0, y: 0 }
};

// Game Objects
let player = null;
let playerLevelSprite = null; // Global tracker for player level text sprite
let projectiles = [];
let enemies = [];
let gates = [];
let particles = [];
let floatingTexts = [];
let boss = null;
let bossSpawned = false;

// Timers
let enemyTimer = 90;
let gateTimer = 120;

// WebSocket client
const wsClient = new WebSocketClient();

// Canvas and context
const canvas = document.getElementById('gameCanvas');

// Initialize 3D renderer
initRenderer();

// UI Elements
const menuOverlay = document.getElementById('menuOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const uiOverlay = document.getElementById('uiOverlay');
const characterWindow = document.getElementById('characterWindow');
const talentsWindow = document.getElementById('talentsWindow');
// weaponPrompt removed - automatic weapon upgrades now

// Menu button handlers
document.getElementById('newGameBtn').addEventListener('click', () => {
    resetGame();
    hideMenu();
});

document.getElementById('connectBtn').addEventListener('click', () => {
    console.log('Attempting to connect to WebSocket server...');
    wsClient.enable();
});

// Window resize handler
window.addEventListener('resize', () => {
    if (renderer && camera) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
});

// Game loop
function gameLoop() {
    if (gameState.inMenu) {
        // Just update UI in menu
        updateUI();
    } else {
        updateGame();
        drawGame();

        if (gameState.gameOver && !gameOverOverlay.classList.contains('hidden') === false) {
            showGameOver();
        }
    }

    requestAnimationFrame(gameLoop);
}

// Initialize game
function init() {
    loadGameData();
    updateUI();

    // WebSocket is optional - game works offline
    console.log('Starting game...');
    console.log('WebSocket server is optional - game runs offline by default');

    // Only try WebSocket if explicitly enabled
    // wsClient.enable(); // Uncomment this line if you have a WebSocket server running

    // Start game loop
    gameLoop();
}

// Start the game
init();
