// 3D Renderer with Three.js
let scene, camera, renderer;
let waterMaterial, bridgeMaterial;

// Text sprite creation function
function createTextSprite(text, color = '#ffffff', size = 64, backgroundColor = 'rgba(0, 0, 0, 0.8)', widthMultiplier = 1) {
    // Defensive check for undefined/null text
    if (!text || typeof text !== 'string') {
        text = '?'; // Fallback text
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Limit text length to prevent huge sprites
    const displayText = text.length > 15 ? text.substring(0, 15) + '...' : text;

    // Use reasonable base font size, then scale in 3D
    const baseFontSize = Math.min(size, 120); // Increased cap for larger fonts
    context.font = `bold ${baseFontSize}px Arial`;
    const textWidth = context.measureText(displayText).width;

    // Reasonable canvas size with width multiplier
    canvas.width = Math.min(Math.max((textWidth + 30) * widthMultiplier, 100), 800);
    canvas.height = Math.min(baseFontSize + 30, 200);

    // Clear and set font again (canvas resize clears context)
    context.font = `bold ${baseFontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Add background for better visibility
    if (backgroundColor) {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Add border for better definition
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }

    // Add text shadow for better readability
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 2;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;

    // Draw text
    context.fillStyle = color;
    context.fillText(displayText, canvas.width / 2, canvas.height / 2);

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.001,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true // Enable distance-based sizing for better depth perception
    });
    const sprite = new THREE.Sprite(spriteMaterial);

    // Ensure text sprites are always rendered on top
    sprite.renderOrder = 1000;

    // Scale based on requested size vs base size for proper sizing
    const sizeMultiplier = size / 64; // 64 is our reference size
    const baseScale = (canvas.width / (80 * widthMultiplier)) * sizeMultiplier;
    const finalScale = Math.min(Math.max(baseScale, 0.5), 100); // Much larger max scale for huge fonts

    // Apply width multiplier to x-scale for stretching
    sprite.scale.set(finalScale * widthMultiplier, finalScale * 0.8, 1);

    return sprite;
}

// Create health bar sprite
function createHealthBarSprite(health, maxHealth, width = 100, height = 15) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    const healthRatio = Math.max(0, Math.min(1, health / maxHealth));

    // Background
    context.fillStyle = 'rgba(50, 50, 50, 0.9)';
    context.fillRect(0, 0, width, height);

    // Health fill
    const healthColor = healthRatio > 0.6 ? 'rgba(0, 255, 0, 0.8)' :
                       healthRatio > 0.3 ? 'rgba(255, 255, 0, 0.8)' :
                       'rgba(255, 0, 0, 0.8)';
    context.fillStyle = healthColor;
    context.fillRect(2, 2, (width - 4) * healthRatio, height - 4);

    // Border
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 1;
    context.strokeRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.001,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width / 4, height / 4, 1);

    return sprite;
}

function initRenderer() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

    // Create camera (third person)
    camera = new THREE.PerspectiveCamera(75, CONFIG.WIDTH / CONFIG.HEIGHT, 0.1, 2000);

    // Create WebGL renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create materials
    waterMaterial = new THREE.MeshLambertMaterial({ color: 0x326496 });
    bridgeMaterial = new THREE.MeshLambertMaterial({ color: 0x646464 });

    // Create water plane
    const waterGeometry = new THREE.PlaneGeometry(2000, 2000);
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -5;
    scene.add(waterMesh);

    // Create bridge segments
    createBridge();
}

function createBridge() {
    // Create bridge segments that repeat - adjusted for proper bridge width
    for (let i = -30; i <= 30; i++) {
        const bridgeGeometry = new THREE.BoxGeometry(CONFIG.BRIDGE_WIDTH, 5, 300); // Adjusted to match walkable width
        const bridgeMesh = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        bridgeMesh.position.set(0, 0, i * 300); // 3x spacing between segments
        bridgeMesh.receiveShadow = true;
        scene.add(bridgeMesh);
    }
}

function updateCamera() {
    if (!player) return;

    // Third person camera following the player - reduced distance
    const cameraOffset = new THREE.Vector3(0, 100, 160);
    const targetPosition = new THREE.Vector3(
        player.mesh.position.x + cameraOffset.x,
        player.mesh.position.y + cameraOffset.y,
        player.mesh.position.z + cameraOffset.z
    );

    // Smooth camera movement
    camera.position.lerp(targetPosition, 0.1);

    // Look at player with adjusted forward offset
    const lookAtTarget = new THREE.Vector3(
        player.mesh.position.x,
        player.mesh.position.y + 10,
        player.mesh.position.z - 60
    );
    camera.lookAt(lookAtTarget);
}

function drawGame() {
    if (!renderer || !scene || !camera) return;

    updateCamera();

    // Update background (move bridge segments) - adjusted for 3x longer bridge
    scene.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.y === 0) {
            child.position.z += CONFIG.BG_SPEED;
            if (child.position.z > 3000) { // 3x larger reset distance
                child.position.z = -3000;
            }
        }
    });

    renderer.render(scene, camera);
}
