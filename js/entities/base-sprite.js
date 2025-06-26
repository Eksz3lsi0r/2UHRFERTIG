// Base Game Sprite Class
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
