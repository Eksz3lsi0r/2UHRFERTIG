// Input Handler
const keys = {};

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
            // Continuous movement now handled in player.update()
            break;
        case 'KeyD':
        case 'ArrowRight':
            // Continuous movement now handled in player.update()
            break;
        case 'Space':
            if (!gameState.paused && !gameState.gameOver && player) {
                const proj = player.shoot();
                if (proj) {
                    projectiles.push(proj);
                }
            }
            e.preventDefault();
            break;
        case 'KeyU':
            if (!gameState.paused && !gameState.gameOver && player &&
                gameState.distance > 3000 && !player.weaponUpgraded) {
                player.weapon = "upgraded";
                player.weaponUpgraded = true;
                weaponPrompt.classList.add('hidden');
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});
