// Collision Detection System
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
