// Game Logic

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

function handleCollisions() {
    // Projectiles vs Enemies
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (proj.collidesWith(enemy)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const damage = player.level * (isCrit ? 2 : 1);
                enemy.health -= damage;

                // Update enemy health display
                enemy.updateHealthDisplay();

                if (isCrit) {
                    const pos = enemy.getPosition();
                    addFloatingText(`${Math.round(damage)}!!!`, pos.x, pos.y + 30, pos.z, 60, '#ff6600'); // Orange for crit
                } else {
                    const pos = enemy.getPosition();
                    addFloatingText(`${Math.round(damage)}`, pos.x, pos.y + 30, pos.z, 45, '#ffff00'); // Yellow for normal
                }

                proj.destroy();
                projectiles.splice(i, 1);

                if (enemy.health <= 0) {
                    const pos = enemy.getPosition();
                    particles.push(new Particle(pos.x, pos.y, pos.z));
                    enemy.destroy();
                    enemies.splice(j, 1);
                    gameState.enemyKills++;
                    gameState.coins++;
                }
                break;
            }
        }
    }

    // Projectiles vs Gates
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        for (let j = gates.length - 1; j >= 0; j--) {
            const gate = gates[j];
            if (proj.collidesWith(gate)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const multiplier = isCrit ? 2 : 1;

                if (gate.isOperator) {
                    if (gate.operator === '*' || gate.operator === '/') {
                        gate.index += 1 * multiplier;
                        gate.display = `${gate.operator}${Math.abs(gate.index)}`;
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
                    gate.display = `${gate.value > 0 ? '+' : ''}${Math.round(gate.value)}`;
                }

                // Update gate display
                gate.updateTextSprite();

                // Create floating text for gate improvement
                const pos = gate.getPosition();
                const delta = gate.isOperator ? 1 : Math.max(1, Math.floor((player.level + 10) / 20));
                const displayValue = delta * multiplier;

                if (isCrit) {
                    addFloatingText(`+${displayValue}!!!`, pos.x, pos.y + 25, pos.z, 50, '#00ff88'); // Green for gate improvement crit
                } else {
                    addFloatingText(`+${displayValue}`, pos.x, pos.y + 25, pos.z, 40, '#88ff88'); // Light green for gate improvement
                }

                proj.destroy();
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Projectiles vs Boss
    if (boss) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            if (proj.collidesWith(boss)) {
                const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
                const damage = player.level * (isCrit ? 2 : 1);
                boss.health -= damage;

                // Update boss health display
                boss.updateHealthDisplay();

                if (isCrit) {
                    const pos = boss.getPosition();
                    addFloatingText(`${Math.round(damage)}!!!`, pos.x, pos.y + 80, pos.z, 60, '#ff6600'); // Orange for crit
                } else {
                    const pos = boss.getPosition();
                    addFloatingText(`${Math.round(damage)}`, pos.x, pos.y + 80, pos.z, 45, '#ffff00'); // Yellow for normal
                }

                proj.destroy();
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Player vs Gates
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

            // Ensure minimum level
            player.level = Math.max(1, player.level);

            gameState.enemyHealthMultiplier *= 1.1;
            enemies.forEach(enemy => {
                enemy.health *= 1.1;
                enemy.maxHealth *= 1.1;
                enemy.updateHealthDisplay();
            });

            // Update player level display
            player.updateTextSprite();

            gates.splice(i, 1);
            gate.destroy();
        }
    }

    // Player vs Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (player.collidesWith(enemy)) {
            player.level -= enemy.health;
            player.level = Math.max(1, player.level); // Ensure minimum level
            player.updateTextSprite(); // Update display
            enemy.destroy();
            enemies.splice(i, 1);
            gameState.enemyKills++;
        }
    }

    // Player vs Boss
    if (boss && boss.collidesWith(player)) {
        gameState.gameOver = true;
    }
}

function spawnEnemies() {
    enemyTimer--;
    if (enemyTimer <= 0) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < count; i++) {
            const lane = Math.floor(Math.random() * CONFIG.LANE_COUNT);
            enemies.push(new Enemy(lane, player.gateCollision));
        }
        enemyTimer = 90;
    }
}

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

function spawnBoss() {
    if (gameState.distance > Math.random() * 4000 + 8000 && !bossSpawned) {
        boss = new Boss(player);
        bossSpawned = true;
    }
}

function updateGame() {
    if (gameState.paused || gameState.gameOver) return;

    // Update background (handled in renderer)
    gameState.distance += CONFIG.SCROLL_SPEED;

    // Update player
    if (player.update()) {
        // Limit projectiles to prevent performance issues and text spam
        if (projectiles.length < 20) {
            const proj = player.shoot();
            if (proj) {
                projectiles.push(proj);
            }
        }
    }

    // Update game objects
    projectiles.forEach(proj => proj.update());
    enemies.forEach(enemy => enemy.update());
    gates.forEach(gate => gate.update());
    particles.forEach(particle => particle.update());
    floatingTexts.forEach(text => text.update());

    if (boss) {
        boss.update();
    }

    // Remove dead objects
    projectiles = projectiles.filter(proj => {
        if (!proj.alive) {
            proj.destroy();
            return false;
        }
        return true;
    });
    enemies = enemies.filter(enemy => {
        if (!enemy.alive) {
            enemy.destroy();
            return false;
        }
        return true;
    });
    gates = gates.filter(gate => {
        if (!gate.alive) {
            gate.destroy();
            return false;
        }
        return true;
    });
    particles = particles.filter(particle => particle.alive);
    floatingTexts = floatingTexts.filter(text => text.alive);

    // Spawn new objects
    spawnEnemies();
    spawnGates();
    spawnBoss();

    // Handle collisions
    handleCollisions();

    // Check game over conditions
    if (player.level <= 0) {
        gameState.gameOver = true;
    }

    if (boss && boss.health <= 0) {
        gameState.victory = true;
        gameState.gameOver = true;
        gameState.coins += 10;
        gameState.startLevel++;
        gameState.enemyHealthMultiplier = 1;
        gameState.talentpoints = gameState.startLevel - gameState.allocatedTalents;
        saveGameData();
    }

    // Update camera (handled in renderer)
    // Update UI
    updateUI();
    if (gameState.characterWindowOpen) {
        updateCharacterWindow();
    }

    // Check for weapon upgrade prompt
    if (gameState.distance > 3000 && !player.weaponUpgraded) {
        weaponPrompt.classList.remove('hidden');
    } else {
        weaponPrompt.classList.add('hidden');
    }
}

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

    // Reset arrays and create new player
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
}

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

function updateUI() {
    document.getElementById('menuCoins').textContent = gameState.coins;
    document.getElementById('menuLevel').textContent = gameState.startLevel;
    document.getElementById('gameCoins').textContent = gameState.coins;
    document.getElementById('availableTalents').textContent = gameState.talentpoints - gameState.allocatedTalents;
}

function updateCharacterWindow() {
    if (!player) return;

    const stats = document.getElementById('characterStats');
    const autoInterval = Math.round(1000 / (1 + 0.02 * (player.level - 1)));

    stats.innerHTML = `
        <div>Level: ${Math.round(player.level)}</div>
        <div>Weapon: ${player.weapon}</div>
        <div>Weapon Upgraded: ${player.weaponUpgraded}</div>
        <div>Gate Collisions: ${player.gateCollision}</div>
        <div>Enemy Health Multiplier: ${gameState.enemyHealthMultiplier.toFixed(2)}</div>
        <div>Start Level: ${gameState.startLevel}</div>
        <div>Projectile Damage: ${Math.round(player.level)}</div>
        <div>Auto-Shoot Interval: ${autoInterval} ms</div>
    `;
}
