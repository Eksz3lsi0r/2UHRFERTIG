// 3D Renderer with Three.js
let scene, camera, renderer;
let waterMaterial, bridgeMaterial;
let starField; // For endless starfield
let isMobileMode = false;

// Check if mobile mode should be active
function checkMobileMode() {
    isMobileMode = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   (window.innerWidth <= 768 && 'ontouchstart' in window);
    return isMobileMode;
}

// Create endless starfield
function createStarField() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000; // Number of stars

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    // Generate random star positions and colors
    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Random positions in a large sphere around the scene
        positions[i3] = (Math.random() - 0.5) * 4000;     // x
        positions[i3 + 1] = (Math.random() - 0.5) * 2000; // y
        positions[i3 + 2] = (Math.random() - 0.5) * 4000; // z

        // Purple-tinted star colors with some variation
        const intensity = 0.5 + Math.random() * 0.5;
        colors[i3] = 0.8 * intensity;     // red component
        colors[i3 + 1] = 0.6 * intensity; // green component
        colors[i3 + 2] = 1.0 * intensity; // blue component (more blue for purple tint)
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Star material
    const starMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: false // Keep stars same size regardless of distance
    });

    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
}

// Update starfield for endless effect
function updateStarField() {
    if (!starField) return;

    // Slowly rotate the starfield for dynamic effect
    starField.rotation.y += 0.0002;
    starField.rotation.x += 0.0001;

    // Move stars based on player movement for parallax effect
    if (typeof gameState !== 'undefined' && gameState.backgroundOffset !== undefined) {
        starField.position.z = gameState.backgroundOffset * 0.1; // Slow parallax
    }
}

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
    // Check if we're in mobile mode
    checkMobileMode();

    // Create scene with deeper purple atmosphere
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x2D1B69, 100, 1500); // Deeper purple fog

    // Create camera (third person) - adjust for mobile
    let aspectRatio, cameraWidth, cameraHeight;

    if (isMobileMode) {
        const canvas = document.getElementById('gameCanvas');
        cameraWidth = canvas.offsetWidth || window.innerWidth;
        cameraHeight = canvas.offsetHeight || (window.innerHeight * 0.65);
        aspectRatio = cameraWidth / cameraHeight;
    } else {
        aspectRatio = CONFIG.WIDTH / CONFIG.HEIGHT;
        cameraWidth = CONFIG.WIDTH;
        cameraHeight = CONFIG.HEIGHT;
    }

    camera = new THREE.PerspectiveCamera(
        75, // Same field of view for both mobile and desktop
        aspectRatio,
        0.1,
        2000
    );

    // Create WebGL renderer with deep purple background
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isMobileMode }); // Disable antialiasing on mobile for performance

    if (isMobileMode) {
        renderer.setSize(cameraWidth, cameraHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    } else {
        renderer.setSize(CONFIG.WIDTH, CONFIG.HEIGHT);
        renderer.setPixelRatio(window.devicePixelRatio);
    }

    renderer.setClearColor(0x1A0F2E, 1); // Very deep purple background
    renderer.shadowMap.enabled = !isMobileMode; // Disable shadows on mobile for performance
    if (!isMobileMode) {
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Add lighting with purple tint
    const ambientLight = new THREE.AmbientLight(0x6B2F7F, 0.7); // Purple ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xB19CD9, 0.8); // Light purple directional light
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create materials with purple color scheme
    waterMaterial = new THREE.MeshLambertMaterial({ color: 0x7B68EE }); // Medium slate blue water
    bridgeMaterial = new THREE.MeshLambertMaterial({ color: 0x9370DB }); // Medium purple bridge

    // Create water plane - wider for mobile to show full scene
    const waterWidth = isMobileMode ? 3000 : 2000;
    const waterGeometry = new THREE.PlaneGeometry(waterWidth, 2000);
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -5;
    scene.add(waterMesh);

    // Create bridge segments
    createBridge();

    // Create starfield
    createStarField();
}

function createBridge() {
    // Python: pygame.draw.rect(screen, BRIDGE_COLOR, (BRIDGE_X, bridge_y, BRIDGE_WIDTH, HEIGHT * 2))
    // Create bridge segments that repeat - matching Python's bridge dimensions
    for (let i = -30; i <= 30; i++) {
        const bridgeGeometry = new THREE.BoxGeometry(CONFIG.BRIDGE_WIDTH, 5, CONFIG.HEIGHT * 2);
        const bridgeMesh = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        bridgeMesh.position.set(CONFIG.BRIDGE_X + CONFIG.BRIDGE_WIDTH / 2 - CONFIG.WIDTH / 2, 0, i * CONFIG.HEIGHT * 2);
        bridgeMesh.receiveShadow = true;
        scene.add(bridgeMesh);
    }
}

function updateCamera() {
    if (!player) return;

    // Camera positioning - identical for both mobile and desktop
    const cameraOffset = new THREE.Vector3(0, 150, 240); // Same positioning for all platforms

    const targetPosition = new THREE.Vector3(
        player.mesh.position.x + cameraOffset.x,
        player.mesh.position.y + cameraOffset.y,
        player.mesh.position.z + cameraOffset.z
    );

    // Smooth camera movement
    camera.position.lerp(targetPosition, 0.1);

    // Look at point - identical for all platforms
    const lookAtTarget = new THREE.Vector3(
        player.mesh.position.x,
        player.mesh.position.y + 5,
        player.mesh.position.z - 200
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

    // Update starfield
    updateStarField();

    renderer.render(scene, camera);
}
