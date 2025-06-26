// Input Handler
const keys = {};
let touchControlsEnabled = false;
let keyboardDetected = false;

// Detect if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
}

// Initialize touch controls
function initializeTouchControls() {
    const touchControls = document.getElementById('touchControls');
    const moveLeftBtn = document.getElementById('moveLeftBtn');
    const moveRightBtn = document.getElementById('moveRightBtn');
    const shootBtn = document.getElementById('shootBtn');
    const tapToShootArea = document.getElementById('tapToShootArea');

    if (!touchControls || !moveLeftBtn || !moveRightBtn || !shootBtn) return;

    // Show/hide touch controls based on device
    if (isMobileDevice() && !keyboardDetected) {
        touchControlsEnabled = true;
        touchControls.style.display = 'flex';
        if (tapToShootArea) {
            tapToShootArea.classList.add('active');
        }
    }

    // Shooting function
    function performShoot() {
        if (!gameState.paused && !gameState.gameOver && player && player.shootCooldown === 0) {
            const proj = player.shoot();
            if (proj) {
                projectiles.push(proj);
            }
        }
    }

    // Left button touch events
    moveLeftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver && player) {
            player.move(-1);
        }
    });

    moveLeftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
    });

    // Right button touch events
    moveRightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver && player) {
            player.move(1);
        }
    });

    moveRightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
    });

    // Shoot button touch events
    shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        performShoot();
    });

    shootBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
    });

    // Tap anywhere to shoot (excluding control buttons)
    if (tapToShootArea) {
        tapToShootArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            performShoot();
        });
    }

    // Prevent context menu on long press
    moveLeftBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    moveRightBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    shootBtn.addEventListener('contextmenu', (e) => e.preventDefault());

    // Also add click events as fallback
    moveLeftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver && player) {
            player.move(-1);
        }
    });

    moveRightBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver && player) {
            player.move(1);
        }
    });

    shootBtn.addEventListener('click', (e) => {
        e.preventDefault();
        performShoot();
    });
}

// Hide touch controls when keyboard is used
function hideControlsOnKeyboard() {
    if (!keyboardDetected) {
        keyboardDetected = true;
        document.body.classList.add('keyboard-detected');
        const touchControls = document.getElementById('touchControls');
        const tapToShootArea = document.getElementById('tapToShootArea');
        if (touchControls) {
            touchControls.style.display = 'none';
        }
        if (tapToShootArea) {
            tapToShootArea.classList.remove('active');
        }
    }
}

function showMenu() {
    menuOverlay.classList.remove('hidden');
    uiOverlay.classList.add('hidden');
    gameState.inMenu = true;
}

function hideMenu() {
    menuOverlay.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    gameState.inMenu = false;
}

function showGameOver() {
    const gameOverText = document.getElementById('gameOverText');
    gameOverText.textContent = gameState.victory ? 'Sieg! Boss besiegt!' : 'Game Over! Squad verloren.';
    gameOverOverlay.classList.remove('hidden');
}

function hideGameOver() {
    gameOverOverlay.classList.add('hidden');
}

function togglePause() {
    gameState.paused = !gameState.paused;
    if (gameState.paused) {
        pauseOverlay.classList.remove('hidden');
    } else {
        pauseOverlay.classList.add('hidden');
    }
}

function toggleCharacterWindow() {
    gameState.characterWindowOpen = !gameState.characterWindowOpen;
    if (gameState.characterWindowOpen) {
        characterWindow.classList.remove('hidden');
        updateCharacterWindow();
    } else {
        characterWindow.classList.add('hidden');
    }
}

function toggleTalentsWindow() {
    gameState.talentsWindowOpen = !gameState.talentsWindowOpen;
    if (gameState.talentsWindowOpen) {
        talentsWindow.classList.remove('hidden');
    } else {
        talentsWindow.classList.add('hidden');
    }
}

function resetTalents() {
    if (gameState.coins >= 100) {
        gameState.coins -= 100;
        gameState.allocatedTalents = 0;
        saveGameData();
        updateUI();
    }
}

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Hide touch controls when keyboard is used
    hideControlsOnKeyboard();

    if (gameState.inMenu) return;

    switch (e.code) {
        case 'Escape':
            if (!gameState.gameOver) {
                togglePause();
            }
            break;
        case 'KeyC':
            if (!gameState.gameOver) {
                toggleCharacterWindow();
            }
            break;
        case 'KeyN':
            if (!gameState.gameOver) {
                toggleTalentsWindow();
            }
            break;
        case 'KeyT':
            if (gameState.talentsWindowOpen) {
                resetTalents();
            }
            break;
        case 'KeyR':
            if (gameState.paused || gameState.gameOver) {
                resetGame();
                hideGameOver();
                pauseOverlay.classList.add('hidden');
                gameState.paused = false;
            }
            break;
        case 'KeyA':
        case 'ArrowLeft':
            // Python: if event.key == pygame.K_a: player.move(-1)
            if (!gameState.paused && !gameState.gameOver && player) {
                player.move(-1);
            }
            break;
        case 'KeyD':
        case 'ArrowRight':
            // Python: elif event.key == pygame.K_d: player.move(1)
            if (!gameState.paused && !gameState.gameOver && player) {
                player.move(1);
            }
            break;
        case 'Space':
            // Python: elif event.key == pygame.K_SPACE and player.shoot_cd == 0:
            if (!gameState.paused && !gameState.gameOver && player && player.shootCooldown === 0) {
                const proj = player.shoot();
                if (proj) {
                    projectiles.push(proj);
                }
            }
            e.preventDefault();
            break;
        // KeyU removed - weapon upgrades are now automatic
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Initialize touch controls on game load
initializeTouchControls();

// Hide touch controls if keyboard is detected
window.addEventListener('keydown', hideControlsOnKeyboard);
