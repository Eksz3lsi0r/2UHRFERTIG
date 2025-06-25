// Game Objects - 3D Version
class GameSprite {
    constructor(x = 0, y = 0, z = 0, width = 40, height = 40, depth = 40) {
        this.mesh = null;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.alive = true;
        this.speed = 0;

        this.createMesh(x, y, z);
    }

    createMesh(x, y, z) {
        // Override in subclasses
    }

    update() {}

    getPosition() {
        return this.mesh ? this.mesh.position : new THREE.Vector3(0, 0, 0);
    }

    updateTextPositions() {
        if (this.mesh) {
            if (this.textSprite) {
                this.textSprite.position.copy(this.mesh.position);
                this.textSprite.position.y += this.height/2 + 40; // Well above object
            }
            if (this.healthBarSprite) {
                this.healthBarSprite.position.copy(this.mesh.position);
                this.healthBarSprite.position.y += this.height/2 + 55; // Above text
            }
        }
    }

    setPosition(x, y, z) {
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
    }

    getBoundingBox() {
        if (!this.mesh) return null;
        const box = new THREE.Box3().setFromObject(this.mesh);
        return box;
    }

    collidesWith(other) {
        const box1 = this.getBoundingBox();
        const box2 = other.getBoundingBox();
        return box1 && box2 && box1.intersectsBox(box2);
    }

    destroy() {
        if (this.mesh && scene) {
            scene.remove(this.mesh);
            this.mesh = null;
        }
        this.alive = false;
    }
}

class Player extends GameSprite {
    constructor() {
        const startX = CONFIG.LANE_POSITIONS[Math.floor(CONFIG.LANE_COUNT / 2)] - CONFIG.BRIDGE_X / 2;
        super(startX, 20, 0, 40, 40, 40);
        this.level = 1;
        this.lane = Math.floor(CONFIG.LANE_COUNT / 2);
        this.shootCooldown = 0;
        this.autoTimer = 0;
        this.weapon = "basic"; // Initialize weapon
        this.weaponUpgraded = false;
        this.gateCollision = 0;
        this.color = 0x00ff00; // Bright green for player
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

        // Create text sprite for level AFTER mesh is positioned and added to scene
        this.updateTextSprite();
    }    updateTextSprite() {
        // Remove old text sprite
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
        }

        // Create new text sprite for player strength with proper positioning
        // Display level multiplied by 50 for player strength
        this.textSprite = createTextSprite(`${Math.round((this.level || 1) * 50)}`, '#ffffff', 200, null, 1);

        if (scene) {
            scene.add(this.textSprite);
            // Always update positions, even if mesh isn't ready yet
            this.updateTextPositions();
        }
    }

    updateTextPositions() {
        if (this.textSprite) {
            if (this.mesh) {
                this.textSprite.position.copy(this.mesh.position);
                this.textSprite.position.y += this.height/2 + 20; // Position text above the player
                this.textSprite.position.z += 5; // Slightly forward for visibility
            } else {
                // Fallback position if mesh isn't ready yet
                this.textSprite.position.set(0, 40, 5);
            }
        }
    }

    move(direction) {
        this.lane = Math.max(0, Math.min(CONFIG.LANE_COUNT - 1, this.lane + direction));
        const targetX = CONFIG.LANE_POSITIONS[this.lane] - CONFIG.BRIDGE_X / 2;

        if (this.mesh) {
            // Reduced movement speed from 0.25 to 0.15 for better control
            this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, 0.15);
        }
    }

    update() {
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // Handle continuous movement when keys are held down
        if (keys && !gameState.paused && !gameState.gameOver) {
            if (keys['KeyA'] || keys['ArrowLeft']) {
                this.move(-1);
            }
            if (keys['KeyD'] || keys['ArrowRight']) {
                this.move(1);
            }
        }

        this.autoTimer++;
        // Limit the auto-shooting rate to prevent screen spam
        const threshold = Math.max(30, 60 / (1 + 0.01 * Math.min(this.level - 1, 50)));

        // Update text sprite position
        this.updateTextPositions();

        if (this.autoTimer >= threshold) {
            this.autoTimer = 0;
            return true; // Should auto-shoot
        }
        return false;
    }

    destroy() {
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
            this.textSprite = null;
        }
        super.destroy();
    }

    shoot() {
        if (this.shootCooldown === 0 && this.mesh) {
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

class Projectile extends GameSprite {
    constructor(x, y, z, weapon = "basic") {
        super(x, y, z, 8, 16, 8);
        this.weapon = weapon || "basic"; // Ensure weapon is never undefined
        this.speed = this.weapon === "upgraded" ? CONFIG.PROJ_SPEED - 2 : CONFIG.PROJ_SPEED;
        this.color = this.weapon === "upgraded" ? 0xff6600 : 0xffff00; // Orange for upgraded, yellow for basic
    }

    createMesh(x, y, z) {
        const geometry = new THREE.SphereGeometry(4, 8, 6);
        // Ensure color is always defined
        const color = this.color || 0xffff00;
        const material = new THREE.MeshLambertMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;

        if (scene) {
            scene.add(this.mesh);
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.z += this.speed;
            if (this.mesh.position.z < -800) { // Increased range from -500 to -800 to reach distant enemies
                this.destroy();
            }
        }
    }
}

class Enemy extends GameSprite {
    constructor(lane, gateCollision) {
        const startX = CONFIG.LANE_POSITIONS[lane] - CONFIG.BRIDGE_X / 2;
        super(startX, 20, -400, 30, 30, 30); // Increased spawn distance from -200 to -400
        this.speed = CONFIG.ENEMY_SPEED;
        this.color = 0xff3333; // Bright red for enemies

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

class Gate extends GameSprite {
    constructor(lane, enemyKillCount) {
        const startX = CONFIG.LANE_POSITIONS[lane] - CONFIG.BRIDGE_X / 2;

        // Initialize display value first
        const extra = Math.floor(enemyKillCount / 5);
        let display, isOperator, operator, index, value;

        if (Math.random() < 0.25) {
            isOperator = true;
            operator = ['+', '-', '*', '/'][Math.floor(Math.random() * 4)];
            index = Math.floor(Math.random() * (4 + extra)) + 2;
            display = `${operator}${Math.abs(index)}`;
        } else {
            isOperator = false;
            value = Math.random() < 0.5 ?
                Math.floor(Math.random() * (4 + extra)) + 2 :
                -(Math.floor(Math.random() * (4 + extra)) + 1);
            display = `${value > 0 ? '+' : ''}${value}`;
        }

        // Call super constructor
        super(startX, 30, -600, 200, 80, 20); // Increased spawn distance from -300 to -600

        // Set properties after super call
        this.speed = CONFIG.GATE_SPEED;
        this.color = 0x00ff88; // Bright cyan-green for gates
        this.textSprite = null;
        this.isOperator = isOperator;
        this.operator = operator;
        this.index = index;
        this.value = value;
        this.display = display;

        // Now create the text sprite with the proper display value
        this.updateTextSprite();

        // Ensure text sprite is added to scene
        if (this.textSprite && scene) {
            scene.add(this.textSprite);
        }
    }

    createMesh(x, y, z) {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        // Ensure color is always defined for Gate
        const color = this.color || 0x00ff88;
        const material = new THREE.MeshLambertMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Text sprite will be created in constructor after display value is set

        if (scene) {
            scene.add(this.mesh);
            if (this.textSprite) {
                scene.add(this.textSprite);
            }
        }
    }    updateTextSprite() {
        // Remove old text sprite
        if (this.textSprite && scene) {
            scene.remove(this.textSprite);
        }

        // Ensure display value exists
        if (!this.display) {
            console.warn('Gate display value is undefined, skipping text sprite creation');
            return;
        }

        // Determine text color based on value/operator
        let textColor = '#ffffff';
        if (this.isOperator) {
            if (this.operator === '+' || this.operator === '*') {
                textColor = '#00ff00'; // Green for positive operators
            } else {
                textColor = '#ff4444'; // Red for negative operators
            }
        } else {
            textColor = this.value >= 0 ? '#00ff00' : '#ff4444';
        }

        // Create new text sprite with halved font size for gate values (128 * 25 = 3200)
        this.textSprite = createTextSprite(this.display, textColor, 3200, 'rgba(0, 0, 0, 0.9)');

        if (scene) {
            scene.add(this.textSprite);
        }

        this.updateTextPositions();
    }

    updateTextPositions() {
        if (this.textSprite) {
            if (this.mesh) {
                this.textSprite.position.copy(this.mesh.position);
                this.textSprite.position.y += 5; // Center vertically on gate
                this.textSprite.position.z += this.depth/4; // Slightly forward for visibility
            } else {
                // Fallback position if mesh isn't ready yet
                this.textSprite.position.set(0, 25, -300);
            }
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.z += this.speed;

            // Update text position
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
        super.destroy();
    }
}

class Boss extends GameSprite {
    constructor(player) {
        super(0, 50, -800, 120, 120, 120); // Increased spawn distance from -400 to -800
        this.speed = CONFIG.BOSS_SPEED;
        this.color = 0x880000; // Dark red for boss

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

class Particle {
    constructor(x, y, z) {
        this.mesh = null;
        this.alive = true;
        this.lifetime = 20;
        this.dx = (Math.random() - 0.5) * 2;
        this.dy = (Math.random() - 0.5) * 2;
        this.dz = (Math.random() - 0.5) * 2;

        this.createMesh(x, y, z);
    }

    createMesh(x, y, z) {
        const geometry = new THREE.SphereGeometry(2, 8, 6);
        const colors = [0xffc800, 0xff9600, 0xffff00];
        const colorIndex = Math.floor(Math.random() * colors.length);
        const color = colors[colorIndex] || 0xffff00; // Fallback to yellow
        const material = new THREE.MeshLambertMaterial({ color: color });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);

        if (scene) {
            scene.add(this.mesh);
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.x += this.dx;
            this.mesh.position.y += this.dy;
            this.mesh.position.z += this.dz;
        }

        this.lifetime--;
        if (this.lifetime <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.mesh && scene) {
            scene.remove(this.mesh);
            this.mesh = null;
        }
        this.alive = false;
    }
}

class FloatingText {
    constructor(text, x, y, z, lifetime = 80, color = '#ffff00') {
        this.text = text;
        this.startLifetime = lifetime;
        this.lifetime = lifetime;
        this.alive = true;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 2,
            y: 2.5, // Float upward
            z: (Math.random() - 0.5) * 2
        };

        // Create 3D text sprite with reasonable font size for floating text
        this.sprite = createTextSprite(text, color, 64, 'rgba(0, 0, 0, 0.8)');
        this.sprite.position.set(x, y, z);

        // Start with larger initial scale for better visibility
        this.sprite.scale.multiplyScalar(1.2);

        if (scene) {
            scene.add(this.sprite);
        }
    }

    update() {
        if (!this.alive || !this.sprite) return;

        // Float with velocity
        this.sprite.position.x += this.velocity.x;
        this.sprite.position.y += this.velocity.y;
        this.sprite.position.z += this.velocity.z;

        // Slow down movement over time
        this.velocity.x *= 0.95;
        this.velocity.z *= 0.95;
        this.velocity.y *= 0.98;

        this.lifetime--;

        // Fade out effect based on remaining lifetime
        const fadeRatio = this.lifetime / this.startLifetime;
        this.sprite.material.opacity = Math.max(0, fadeRatio);        // Scale effect - more visible scaling
        const scaleProgress = 1 - fadeRatio;
        let scaleFactor;
        if (scaleProgress < 0.2) {
            // Slight grow phase
            scaleFactor = 1.2 + (scaleProgress * 0.3); // 1.2 to 1.26
        } else {
            // Shrink phase
            scaleFactor = 1.26 - ((scaleProgress - 0.2) * 0.4); // 1.26 to 0.94
        }

        // Ensure scaleFactor stays within reasonable bounds
        scaleFactor = Math.min(Math.max(scaleFactor, 0.2), 1.5);
        this.sprite.scale.set(scaleFactor, scaleFactor, scaleFactor);

        if (this.lifetime <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.alive = false;
        if (this.sprite && scene) {
            scene.remove(this.sprite);
            this.sprite = null;
        }
    }
}
