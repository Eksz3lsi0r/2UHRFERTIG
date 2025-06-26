// Player Entity Class
class Player extends GameSprite {
    constructor() {
        // Position player in center lane using bridge coordinate system
        const startLane = Math.floor(CONFIG.LANE_COUNT / 2); // lane 1 (middle)
        const bridgeCenterX = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2;
        const sectionWidth = CONFIG.BRIDGE_WIDTH / CONFIG.LANE_COUNT;
        const laneOffsetFromCenter = (startLane - 1) * sectionWidth; // 0 for middle lane
        const startX = bridgeCenterX + laneOffsetFromCenter;
        super(startX, 20, 0, 40, 40, 40);
        this.level = 1;
        this.lane = startLane;
        this.shootCooldown = 0;
        this.autoTimer = 0;
        this.weapon = "basic"; // Initialize weapon
        this.weaponUpgraded = false;
        this.gateCollision = 0;
        this.color = 0x0078ff; // Python: PLAYER_COLOR = (0,120,255)
        this.textSprite = null;
    }

    createMesh(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        // Ensure color is always defined for Player
        const color = this.color || 0x00ff00;
        const material = new THREE.MeshLambertMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        if (scene) {
            scene.add(this.mesh);
        }

        // Create level text sprite above player
        this.updateTextSprite();

        // Ensure the text position is correct after creation
        setTimeout(() => {
            if (this.textSprite && this.mesh) {
                this.updateTextPositions();
            }
        }, 10); // Small delay to ensure everything is properly initialized
    }

    updateTextSprite() {
        // Update CSS-based level display instead of 3D sprite
        const levelDisplay = document.getElementById('levelDisplay');
        if (levelDisplay) {
            const oldLevel = levelDisplay.textContent;
            levelDisplay.textContent = `Level: ${Math.round(this.level || 1)}`;

            // Add animation class if level changed
            if (oldLevel !== levelDisplay.textContent) {
                levelDisplay.classList.add('level-changed');
                setTimeout(() => levelDisplay.classList.remove('level-changed'), 300);
            }

            this.updateLevelDisplayPosition();
        }
    }

    updateLevelDisplayPosition() {
        const levelDisplay = document.getElementById('levelDisplay');
        if (!levelDisplay || !this.mesh) return;

        // Project 3D player position to screen coordinates
        const vector = new THREE.Vector3();
        vector.copy(this.mesh.position);
        vector.y += this.height/2 + 10; // Position above player
        vector.project(camera);

        // Convert to screen coordinates
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
        const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;

        // Use CSS custom properties instead of inline styles
        levelDisplay.style.setProperty('--player-x', x + 'px');
        levelDisplay.style.setProperty('--player-y', y + 'px');
        levelDisplay.style.left = 'var(--player-x)';
        levelDisplay.style.top = 'var(--player-y)';

        // Use CSS classes for visibility
        levelDisplay.classList.remove('hidden');
        levelDisplay.classList.add('visible');
    }

    move(direction) {
        // Python: self.lane = max(0, min(LANE_COUNT-1, self.lane+dir))
        this.lane = Math.max(0, Math.min(CONFIG.LANE_COUNT - 1, this.lane + direction));
        // Position using bridge coordinate system
        const bridgeCenterX = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2;
        const sectionWidth = CONFIG.BRIDGE_WIDTH / CONFIG.LANE_COUNT;
        const laneOffsetFromCenter = (this.lane - 1) * sectionWidth;
        const targetX = bridgeCenterX + laneOffsetFromCenter;

        if (this.mesh) {
            this.mesh.position.x = targetX;
            // Update CSS level display position immediately after moving
            this.updateLevelDisplayPosition();
        }
    }

    update() {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        this.autoTimer++;
        // Python's threshold formula: 60 / (1 + 0.02*(self.level - 1))
        const threshold = 60 / (1 + 0.02 * (this.level - 1));

        // Update CSS level display position every frame
        this.updateLevelDisplayPosition();

        if (this.autoTimer >= threshold) {
            this.autoTimer = 0;
            return true; // Should auto-shoot
        }
        return false;
    }

    destroy() {
        // Hide CSS level display using CSS classes
        const levelDisplay = document.getElementById('levelDisplay');
        if (levelDisplay) {
            levelDisplay.classList.remove('visible');
            levelDisplay.classList.add('hidden');
        }

        // Clear old text sprite if it exists
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
            this.textSprite = null;
        }

        // Clear global tracker
        if (typeof playerLevelSprite !== 'undefined' && playerLevelSprite === this.textSprite) {
            playerLevelSprite = null;
        }
        super.destroy();
    }

    shoot() {
        if (this.shootCooldown === 0 && this.mesh) {
            // Python's shoot cooldown: 15 if player.level < 20 else 8
            this.shootCooldown = this.level < 20 ? 15 : 8;
            return new Projectile(
                this.mesh.position.x,
                this.mesh.position.y,
                this.mesh.position.z - 20,
                this.weapon || "basic" // Ensure weapon is never undefined
            );
        }
        return null;
    }
}
