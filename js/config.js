// Game Configuration
const CONFIG = {
    WIDTH: 1200,
    HEIGHT: 800,
    FPS: 60,
    LANE_COUNT: 3,
    LANE_WIDTH: 100,
    SCROLL_SPEED: 4,
    BG_SPEED: 2,
    PROJ_SPEED: -10,
    ENEMY_SPEED: 3,
    GATE_SPEED: 5,
    BOSS_SPEED: 1.2,
    CRIT_CHANCE: 0.2,
    MAX_FLOATING_TEXTS: 20 // Limit floating text animations
};

CONFIG.BRIDGE_WIDTH = CONFIG.LANE_COUNT * CONFIG.LANE_WIDTH; // Bridge width matches walkable area
CONFIG.BRIDGE_X = 0; // Center in 3D space
CONFIG.LANE_POSITIONS = [];
for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
    // Position lanes relative to center
    const offset = (i - Math.floor(CONFIG.LANE_COUNT / 2)) * CONFIG.LANE_WIDTH;
    CONFIG.LANE_POSITIONS.push(offset);
}
