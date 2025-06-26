// Entity Spawning System

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
