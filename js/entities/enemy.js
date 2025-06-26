// Enemy Entity Class
class Enemy extends GameSprite {
    constructor(lane, gateCollision) {
        // Position enemy using bridge coordinate system
        const bridgeCenterX = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2;
        const sectionWidth = CONFIG.BRIDGE_WIDTH / CONFIG.LANE_COUNT;
        const laneOffsetFromCenter = (lane - 1) * sectionWidth;
        const startX = bridgeCenterX + laneOffsetFromCenter + 5; // +5 like Python
        super(startX, 20, -800, 30, 30, 30); // Much further spawn distance (-800 instead of -30)
        this.speed = CONFIG.ENEMY_SPEED;
        this.color = 0xff3232; // Python: ENEMY_COLOR = (255,50,50)

        // Python's health calculation: 5 * lvl_mult * enemy_health_multiplier * gate_mult
        const levelMult = Math.pow(1.2, gameState.startLevel - 1);
        const gateMult = gateCollision > 1 ? Math.pow(2.0, gateCollision - 1) : 1;
        this.health = 5 * levelMult * gameState.enemyHealthMultiplier * gateMult;
        this.maxHealth = this.health;
        this.textSprite = null;
        this.healthBarSprite = null;
    }

    createMesh(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        // Ensure color is always defined for Enemy
        const color = this.color || 0xff3333;
        const material = new THREE.MeshLambertMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        if (scene) {
            scene.add(this.mesh);
        }

        // Create text sprite for health AFTER mesh is positioned and added to scene
        this.updateHealthDisplay();
    }

    updateHealthDisplay() {
        // Remove old sprites
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
        }
        if (this.healthBarSprite && scene) {
            scene.remove(this.healthBarSprite);
        }

        // Create health text sprite with larger font size for enemy (72 * 10 = 720)
        this.textSprite = createTextSprite(Math.round(this.health || 0).toString(), '#ffffff', 720);

        // Create health bar sprite
        this.healthBarSprite = createHealthBarSprite(this.health, this.maxHealth, 60, 8);

        if (scene) {
            scene.add(this.textSprite);
            scene.add(this.healthBarSprite);
        }

        this.updateTextPositions();
    }

    updateTextPositions() {
        if (this.textSprite) {
            if (this.mesh) {
                this.textSprite.position.copy(this.mesh.position);
                this.textSprite.position.y += this.height/2 + 15; // Above enemy
            } else {
                // Fallback position if mesh isn't ready yet
                this.textSprite.position.set(0, 50, -200);
            }
        }
        if (this.healthBarSprite) {
            if (this.mesh) {
                this.healthBarSprite.position.copy(this.mesh.position);
                this.healthBarSprite.position.y += this.height/2 + 25; // Above text
            } else {
                // Fallback position if mesh isn't ready yet
                this.healthBarSprite.position.set(0, 60, -200);
            }
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.z += this.speed;

            // Update text positions
            this.updateTextPositions();

            if (this.mesh.position.z > 200) {
                this.destroy();
            }
        }
    }

    destroy() {
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
            this.textSprite = null;
        }
        if (this.healthBarSprite && scene) {
            scene.remove(this.healthBarSprite);
            this.healthBarSprite = null;
        }
        super.destroy();
    }
}
