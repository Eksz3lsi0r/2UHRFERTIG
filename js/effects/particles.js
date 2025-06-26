// Particle and FloatingText Effect Classes

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
    constructor(text, x, y, z, lifetime = 30, color = '#ff0000') { // Default lifetime 30 like Python
        this.text = text;
        this.startLifetime = lifetime;
        this.lifetime = lifetime;
        this.alive = true;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 2,
            y: 1, // Python: self.y -= 1 per frame
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

        // Python movement: self.y -= 1
        this.sprite.position.y += this.velocity.y;
        this.sprite.position.x += this.velocity.x * 0.3; // Slower horizontal movement
        this.sprite.position.z += this.velocity.z * 0.3;

        this.lifetime--;

        // Fade out effect based on remaining lifetime
        const fadeRatio = this.lifetime / this.startLifetime;
        this.sprite.material.opacity = Math.max(0, fadeRatio);

        // Scale effect - more visible scaling
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
