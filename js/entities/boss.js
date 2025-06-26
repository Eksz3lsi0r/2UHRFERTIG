// Boss Entity Class
class Boss extends GameSprite {
    constructor(player) {
        const bossWidth = 120;
        const bossHeight = 120;
        // Position boss at center of bridge
        const bridgeCenterX = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2;
        const startX = bridgeCenterX;
        super(startX, 50, -1200, bossWidth, bossHeight, bossHeight); // Much further spawn distance (-1200)
        this.speed = CONFIG.BOSS_SPEED;
        this.color = 0xc80000; // Python: BOSS_COLOR = (200,0,0)

        // Python's boss health calculation: 250 * lvl_mult * enemy_health_multiplier * gate_mult
        const levelMult = Math.pow(1.2, gameState.startLevel - 1);
        const gateMult = Math.pow(2.0, Math.max(0, player.gateCollision - 1));
        this.health = 250 * levelMult * gameState.enemyHealthMultiplier * gateMult;
        this.maxHealth = this.health;
        this.textSprite = null;
        this.healthBarSprite = null;
    }

    createMesh(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        // Ensure color is always defined for Boss
        const color = this.color || 0x880000;
        const material = new THREE.MeshLambertMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Create text sprite for health
        this.updateHealthDisplay();

        if (scene) {
            scene.add(this.mesh);
            if (this.textSprite) {
                scene.add(this.textSprite);
            }
            if (this.healthBarSprite) {
                scene.add(this.healthBarSprite);
            }
        }
    }

    updateHealthDisplay() {
        // Remove old sprites
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
        }
        if (this.healthBarSprite && scene) {
            scene.remove(this.healthBarSprite);
        }

        // Create health text sprite with larger font
        this.textSprite = createTextSprite(`BOSS: ${Math.round(this.health || 0)}`, '#ffffff', 32, 'rgba(136, 0, 0, 0.9)');

        // Create health bar sprite
        this.healthBarSprite = createHealthBarSprite(this.health, this.maxHealth, 120, 20);

        if (scene) {
            scene.add(this.textSprite);
            scene.add(this.healthBarSprite);
        }

        this.updateTextPositions();
    }

    updateTextPositions() {
        if (this.mesh) {
            if (this.textSprite) {
                this.textSprite.position.copy(this.mesh.position);
                this.textSprite.position.y += 80;
            }
            if (this.healthBarSprite) {
                this.healthBarSprite.position.copy(this.mesh.position);
                this.healthBarSprite.position.y += 95;
            }
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.z += this.speed;

            // Update text positions
            this.updateTextPositions();
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
