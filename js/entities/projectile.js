// Projectile Entity Class
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
