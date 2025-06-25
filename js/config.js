// Game Configuration - 1:1 from Python version

const CONFIG = {
    // Python: WIDTH, HEIGHT, FPS = 1200, 800, 60
    WIDTH: 1200,
    HEIGHT: 800,
    FPS: 60,

    // Python: LANE_COUNT, LANE_WIDTH = 3, 250
    LANE_COUNT: 3,
    LANE_WIDTH: 83, // 250 / 3 ≈ 83 (3 times smaller)

    // Python: SCROLL_SPEED, BG_SPEED, PROJ_SPEED = 4, 2, -10
    SCROLL_SPEED: 4,
    BG_SPEED: 2,
    PROJ_SPEED: -10,

    // Python: ENEMY_SPEED, GATE_SPEED, BOSS_SPEED = SCROLL_SPEED - 1, SCROLL_SPEED + 1, SCROLL_SPEED * 0.3
    ENEMY_SPEED: 1.5, // Slower movement (was 3)
    GATE_SPEED: 2,    // Slower movement (was 5)
    BOSS_SPEED: 0.6,  // Slower movement (was 1.2)

    // Python: CRIT_CHANCE = 0.2
    CRIT_CHANCE: 0.2,

    MAX_FLOATING_TEXTS: 20 // Limit floating text animations
};

// Bridge width should equal 3 gates side by side
const gateWidth = 200;
CONFIG.BRIDGE_WIDTH = gateWidth * CONFIG.LANE_COUNT; // 200 * 3 = 600 pixels

// Center the bridge on screen
CONFIG.BRIDGE_X = Math.floor((CONFIG.WIDTH - CONFIG.BRIDGE_WIDTH) / 2);

// Calculate lane positions so gates are evenly distributed across bridge
CONFIG.LANE_POSITIONS = [];
for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
    // Center each gate in its section of the bridge
    const sectionWidth = CONFIG.BRIDGE_WIDTH / CONFIG.LANE_COUNT; // 200 pixels per section
    const sectionStart = CONFIG.BRIDGE_X + i * sectionWidth;
    const lanePos = sectionStart + sectionWidth / 2; // Center of section
    CONFIG.LANE_POSITIONS.push(lanePos);
}
