// Gate Entity Class
class Gate extends GameSprite {
    constructor(lane, enemyKillCount) {
        const gateWidth = 200;
        const gateHeight = 80;
        // Position gate to match bridge coordinate system
        // Bridge center in 3D = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2
        const bridgeCenterX = CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2;
        const sectionWidth = CONFIG.BRIDGE_WIDTH / CONFIG.LANE_COUNT; // 200 pixels per section
        // Calculate position relative to bridge center
        const laneOffsetFromCenter = (lane - 1) * sectionWidth; // lane 0=-200, lane 1=0, lane 2=+200
        const startX = bridgeCenterX + laneOffsetFromCenter;

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
        super(startX, 30, -600, gateWidth, gateHeight, 20); // Much further spawn distance (-600 instead of -gateHeight)

        // Set properties after super call
        this.speed = CONFIG.GATE_SPEED;
        this.color = 0x32ff32; // Python: GATE_COLOR = (50,255,50)
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
    }

    updateTextSprite() {
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

        // Create new text sprite with appropriate font size for gate values
        this.textSprite = createTextSprite(this.display, textColor, 900, 'rgba(0, 0, 0, 0.9)');

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
