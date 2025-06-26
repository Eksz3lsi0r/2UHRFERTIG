// Game Loop and Core Logic

// Update game elements - 1:1 from Python version
function updateGameElements() {
    if (player.update()) {
        const proj = player.shoot();
        if (proj) {
            projectiles.push(proj);
        }
    }

    projectiles.forEach(proj => proj.update());
    enemies.forEach(enemy => enemy.update());
    gates.forEach(gate => gate.update());
    particles.forEach(particle => particle.update());
    floatingTexts.forEach(text => text.update());

    if (boss) {
        boss.update();
    }

    // Clean up dead objects like Python's list comprehensions
    particles = particles.filter(p => p.alive);
    floatingTexts = floatingTexts.filter(ft => ft.alive);
}

// Cleanup sprites - 1:1 from Python version
function cleanupSprites() {
    // Clean projectiles that went off screen
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        if (proj.mesh && proj.mesh.position.z < -800) {
            proj.destroy();
            projectiles.splice(i, 1);
        }
    }

    // Clean enemies that passed the player
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.mesh && enemy.mesh.position.z > 200) {
            enemy.destroy();
            enemies.splice(i, 1);
        }
    }

    // Clean gates that passed the player
    for (let i = gates.length - 1; i >= 0; i--) {
        const gate = gates[i];
        if (gate.mesh && gate.mesh.position.z > 200) {
            gate.destroy();
            gates.splice(i, 1);
        }
    }
}

// Main update loop - 1:1 from Python version
function updateGame() {
    if (gameState.paused || gameState.gameOver) return;

    // Update background offset and distance like Python
    gameState.backgroundOffset = (gameState.backgroundOffset + CONFIG.BG_SPEED) % CONFIG.HEIGHT;
    gameState.distance += CONFIG.SCROLL_SPEED;

    // Update game elements
    updateGameElements();

    // Update floating texts - exact same as Python
    floatingTexts.forEach(ft => ft.update());
    floatingTexts = floatingTexts.filter(ft => ft.lifetime > 0);

    // Update timers and spawn objects
    spawnEnemies();
    spawnGates();
    spawnBoss();

    // Handle collisions
    handleCollisions();

    // Update UI
    updateUI();

    // Cleanup sprites
    cleanupSprites();

    // Check game over conditions - exact same as Python
    if (player.level <= 0) {
        gameState.gameOver = true;
    }

    if (boss && boss.health <= 0) {
        // gameState.victory = true;
        // gameState.gameOver = true;
        // Boss kill rewards - exact same as Python
        gameState.coins += 10;
        gameState.startLevel++;
        gameState.enemyHealthMultiplier = 1;
        gameState.talentpoints = gameState.startLevel - gameState.allocatedTalents;
        saveGameData();
    }

    // Update UI
    updateUI();
    if (gameState.characterWindowOpen) {
        updateCharacterWindow();
    }

    // Automatic weapon upgrade system
    if (gameState.distance > 3000 && !player.weaponUpgraded) {
        // Automatically upgrade weapon
        const weapons = ["Laser", "Plasma", "Rocket", "Beam"];
        const selectedWeapon = weapons[Math.floor(Math.random() * weapons.length)];

        player.weapon = selectedWeapon.toLowerCase();
        player.weaponUpgraded = true;

        // Create floating text notification
        const playerPos = player.getPosition();
        addFloatingText(
            `${selectedWeapon} Waffe erhalten!`,
            playerPos.x,
            playerPos.y + 30,
            playerPos.z,
            120, // Longer lifetime for weapon notification
            '#00FF00' // Green color for positive upgrade
        );

        // Also show a temporary UI message
        showWeaponUpgradeNotification(selectedWeapon);
    }
}

// Reset game - 1:1 from Python version
function resetGame() {
    // Clean up existing objects
    if (player) {
        player.destroy();
    }
    projectiles.forEach(proj => proj.destroy());
    enemies.forEach(enemy => enemy.destroy());
    gates.forEach(gate => gate.destroy());
    particles.forEach(particle => particle.destroy());
    if (boss) {
        boss.destroy();
    }

    // Clear global level sprite tracker
    if (typeof playerLevelSprite !== 'undefined') {
        playerLevelSprite = null;
    }

    // Reset arrays and create new player - exact same as Python
    player = new Player();
    projectiles = [];
    enemies = [];
    gates = [];
    particles = [];
    floatingTexts = [];
    boss = null;
    bossSpawned = false;
    enemyTimer = 90;
    gateTimer = 120;
    gameState.distance = 0;
    gameState.enemyKills = 0;
    gameState.backgroundOffset = 0;
    gameState.gameOver = false;
    gameState.victory = false;
    gameState.paused = false;

    // RESET ALL MULTIPLIERS - ensure clean game state
    gameState.enemyHealthMultiplier = 1;
    gameState.startLevel = 1; // Reset start level multiplier

    // Ensure player multipliers are reset (redundant but explicit)
    if (player) {
        player.level = 1;           // Player level multiplier
        player.gateCollision = 0;   // Gate collision multiplier
        player.weapon = "basic";    // Weapon multiplier reset
        player.weaponUpgraded = false;
    }

    console.log("All multipliers reset to base values");
}
