/* DEPRECATED - This file has been split into modular components
 * Use the following new structure instead:
 *
 * systems/collision.js        - Collision detection and floating text management
 * systems/spawning.js         - Entity spawning (enemies, gates, boss)
 * systems/data-manager.js     - Save/load game data
 * systems/ui-manager.js       - UI updates and character window
 * core/game-loop.js           - Main game loop, update, and reset functions
 *
 * This file is kept for backward compatibility
 */

// Game Logic - 1:1 implementation from Python version

// Floating text management
const MAX_FLOATING_TEXTS = 15; // Limit number of floating texts on screen

// Helper function to add floating text with limit
function addFloatingText(text, x, y, z, lifetime = 60, color = '#ffff00') {
    // Remove oldest texts if we're at the limit
    while (floatingTexts.length >= MAX_FLOATING_TEXTS) {
        const oldText = floatingTexts.shift();
        if (oldText) {
            oldText.destroy();
        }
    }

    floatingTexts.push(new FloatingText(text, x, y, z, lifetime, color));
}

// Format function like Python's fmt()
function fmt(n) {
    return Math.round(n);
}

// Handle collisions - 1:1 from Python version
function handleCollisions() {
    // Collision: Projectiles vs Enemies
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (proj.collidesWith(enemy)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const dmg = player.level * (isCrit ? 2 : 1);
                enemy.health -= dmg;

                // Update enemy health display
                enemy.updateHealthDisplay();

                if (isCrit) {
                    const pos = enemy.getPosition();
                    addFloatingText(`${fmt(dmg)}!!!`, pos.x, pos.y - 20, pos.z, 60, '#ff0000'); // Red for crit like Python
                }

                proj.destroy();
                projectiles.splice(i, 1);

                if (enemy.health <= 0) {
                    const pos = enemy.getPosition();
                    particles.push(new Particle(pos.x, pos.y, pos.z));
                    enemy.destroy();
                    enemies.splice(j, 1);
                    gameState.enemyKills++;
                    gameState.coins++; // Award 1 coin per enemy kill
                }
                break;
            }
        }
    }

    // Collision: Projectiles vs Gates
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        for (let j = gates.length - 1; j >= 0; j--) {
            const gate = gates[j];
            if (proj.collidesWith(gate)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const multiplier = isCrit ? 2 : 1;

                if (gate.isOperator) {
                    if (gate.operator === '*') {
                        gate.index += 1 * multiplier;
                        gate.display = `*${Math.abs(gate.index)}`;
                    } else if (gate.operator === '/') {
                        gate.index += 1 * multiplier;
                        gate.display = `/${Math.abs(gate.index)}`;
                    } else if (gate.operator === '+') {
                        gate.index += 1 * multiplier;
                        gate.display = `+${Math.abs(gate.index)}`;
                    } else if (gate.operator === '-') {
                        gate.operator = '+';
                        gate.index = 1 * multiplier;
                        gate.display = `+${Math.abs(gate.index)}`;
                    }
                } else {
                    const baseChange = Math.max(1, Math.floor((player.level + 10) / 20));
                    gate.value += baseChange * multiplier;
                    gate.display = `${Math.round(gate.value) > 0 ? '+' : ''}${Math.round(gate.value)}`;
                }

                // Update gate display
                gate.updateTextSprite();

                // Create floating text for gate improvement
                if (isCrit) {
                    const pos = gate.getPosition();
                    const delta = gate.isOperator ? 1 : Math.max(1, Math.floor((player.level + 10) / 20));
                    const displayValue = delta * multiplier;
                    addFloatingText(`${displayValue}!!!`, pos.x, pos.y - 20, pos.z, 50, '#ff0000'); // Red for gate improvement crit
                }

                proj.destroy();
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Collision: Projectiles vs Boss
    if (boss) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (proj.collidesWith(boss)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const dmg = player.level * (isCrit ? 2 : 1);
                boss.health -= dmg;

                // Update boss health display
                boss.updateHealthDisplay();

                if (isCrit) {
                    const pos = boss.getPosition();
                    addFloatingText(`${fmt(dmg)}!!!`, pos.x, pos.y - 20, pos.z, 60, '#ff0000'); // Red for crit
                }

                proj.destroy();
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Collision: Player vs Gates
    for (let i = gates.length - 1; i >= 0; i--) {
        const gate = gates[i];
        if (player.collidesWith(gate)) {
            player.gateCollision++;

            if (gate.isOperator) {
                if (gate.index >= 0) {
                    switch (gate.operator) {
                        case '*':
                            player.level *= gate.index;
                            break;
                        case '/':
                            if (gate.index !== 0) {
                                player.level = Math.floor(player.level / gate.index);
                            }
                            break;
                        case '+':
                            player.level += gate.index;
                            break;
                        case '-':
                            player.level -= gate.index;
                            break;
                    }
                } else {
                    switch (gate.operator) {
                        case '*':
                        case '/':
                            player.level -= gate.index;
                            break;
                        case '+':
                            player.level += gate.index;
                            break;
                        case '-':
                            player.level -= gate.index;
                            break;
                    }
                }
            } else {
                player.level += gate.value;
            }

            gameState.enemyHealthMultiplier *= 1.1;
            enemies.forEach(enemy => {
                enemy.health *= 1.1;
                enemy.maxHealth *= 1.1;
                enemy.updateHealthDisplay();
            });

            // Update player level display above player
            player.updateTextSprite();

            gates.splice(i, 1);
            gate.destroy();
        }
    }

    // Collision: Player vs Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (player.collidesWith(enemy)) {
            player.level -= enemy.health;
            player.updateTextSprite(); // Update level display above player
            enemy.destroy();
            enemies.splice(i, 1);
            gameState.enemyKills++;
        }
    }

    // Collision: Player vs Boss
    if (boss && boss.collidesWith(player)) {
        gameState.gameOver = true;
    }
}

// Spawn enemies - 1:1 from Python version
function spawnEnemies() {
    enemyTimer--;
    if (enemyTimer <= 0) {
        const count = Math.floor(Math.random() * 2) + 1; // random.randint(1,2)
        for (let i = 0; i < count; i++) {
            const lane = Math.floor(Math.random() * CONFIG.LANE_COUNT); // random.randint(0, LANE_COUNT-1)
            enemies.push(new Enemy(lane, player.gateCollision));
        }
        enemyTimer = 90;
    }
}

// Spawn gates - 1:1 from Python version
function spawnGates() {
    gateTimer--;
    if (gateTimer <= 0) {
        for (let lane = 0; lane < CONFIG.LANE_COUNT; lane++) {
            if (Math.random() < 0.5) {
                gates.push(new Gate(lane, gameState.enemyKills));
            }
        }
        gateTimer = 120;
    }
}

// Spawn boss - 1:1 from Python version
function spawnBoss() {
    if (gameState.distance > Math.random() * 4000 + 8000 && !bossSpawned) { // random.randint(8000,12000)
        boss = new Boss(player);
        bossSpawned = true;
    }
}

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

    // Check for weapon upgrade prompt - exact same as Python
    if (gameState.distance > 3000 && !player.weaponUpgraded) {
        weaponPrompt.classList.remove('hidden');
    } else {
        weaponPrompt.classList.add('hidden');
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

    // Reset enemy health multiplier like Python after game restart
    if (boss && boss.health <= 0) {
        // Boss kill case
        gameState.enemyHealthMultiplier = 1;
    } else if (boss && boss.health >= 1) {
        // Boss not defeated case
        gameState.enemyHealthMultiplier = 1;
    }
}

// Save/Load game data - 1:1 from Python version
function saveGameData() {
    const data = {
        coins: gameState.coins,
        startLevel: gameState.startLevel,
        talentpoints: gameState.talentpoints,
        allocatedTalents: gameState.allocatedTalents
    };
    localStorage.setItem('runnerShooterSave', JSON.stringify(data));

    // Send to WebSocket server
    wsClient.send({
        type: 'saveGame',
        data: data
    });
}

function loadGameData() {
    const saved = localStorage.getItem('runnerShooterSave');
    if (saved) {
        const data = JSON.parse(saved);
        gameState.coins = data.coins || 1000;
        gameState.startLevel = data.startLevel || 1;
        gameState.talentpoints = data.talentpoints || 1;
        gameState.allocatedTalents = data.allocatedTalents || 0;
    }
    updateUI();
}

// Update UI - matching Python's display format
function updateUI() {
    document.getElementById('menuCoins').textContent = gameState.coins;
    document.getElementById('gameCoins').textContent = gameState.coins;
    document.getElementById('availableTalents').textContent = gameState.talentpoints - gameState.allocatedTalents;
}

// Update character window - matching Python's display
function updateCharacterWindow() {
    if (!player) return;

    const stats = document.getElementById('characterStats');
    const autoInterval = Math.round(60 / (1 + 0.02 * (player.level - 1))); // Python's threshold formula

    stats.innerHTML = `
        <div>Weapon: ${player.weapon}</div>
        <div>Weapon Upgraded: ${player.weaponUpgraded}</div>
        <div>Gate Collisions: ${player.gateCollision}</div>
        <div>Enemy Health Multiplier: ${gameState.enemyHealthMultiplier.toFixed(2)}</div>
        <div>Start Level: ${gameState.startLevel}</div>
        <div>Projectile Damage: ${fmt(player.level)}</div>
        <div>Auto-Shoot Threshold: ${autoInterval} frames</div>
    `;
}
