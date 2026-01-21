// Three.js Setup
let scene, camera, renderer;
let ball, paddle1, paddle2, table, ballLight;
let particles = [];
let trailPoints = [];
let stars = [];
const resetButton = document.getElementById("resetButton");
const playModeButton = document.getElementById("playModeButton");

// Mausposition
let mouseX = 0;
let isManualMode = false;

// Spielkonstanten
const TABLE_WIDTH = 20;
const TABLE_LENGTH = 30;
const PADDLE_WIDTH = 1;
const PADDLE_HEIGHT = 5;
const BALL_RADIUS = 0.3;
const WINNING_SCORE = 10;

// Spielzustand
const gameState = {
  ball: {
    velocity: { x: 0.15, z: 0.12 },
  },
  paddle1: {
    position: { y: 0 },
    velocity: 0,
    speed: 0.15,
  },
  paddle2: {
    position: { y: 0 },
    velocity: 0,
    speed: 0.15,
  },
  score1: 0,
  score2: 0,
};

// Initialisierung der 3D-Szene
function initScene() {
  const container = document.getElementById("gameCanvas");

  // Szene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0015);
  scene.fog = new THREE.Fog(0x1a0030, 30, 80);

  // Erstelle magischen Sternenhimmel
  createStarfield();

  // Kamera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 15, 28);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lichter
  const ambientLight = new THREE.AmbientLight(0x6a4c93, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffd700, 0.7);
  directionalLight.position.set(5, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);

  // Magische Punktlichter
  const magicLight1 = new THREE.PointLight(0x00ffff, 1.5, 20);
  magicLight1.position.set(-10, 8, 0);
  scene.add(magicLight1);

  const magicLight2 = new THREE.PointLight(0xff00ff, 1.5, 20);
  magicLight2.position.set(10, 8, 0);
  scene.add(magicLight2);

  // Ball-Licht (magisches Leuchten)
  ballLight = new THREE.PointLight(0xffd700, 2, 15);
  scene.add(ballLight);

  // Magische Arena (statt Tisch)
  const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_LENGTH);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d1b4e,
    roughness: 0.2,
    metalness: 0.6,
    emissive: 0x4a148c,
    emissiveIntensity: 0.3,
  });
  table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.y = -0.25;
  table.receiveShadow = true;
  scene.add(table);

  // Magischer Glow-Effekt unter der Arena
  const glowGeometry = new THREE.RingGeometry(
    TABLE_WIDTH / 2 - 2,
    TABLE_WIDTH / 2 + 5,
    32,
  );
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6a0dad,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.5;
  scene.add(glow);

  // Magische Linien
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.8,
  });
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.51, TABLE_LENGTH),
    lineMaterial,
  );
  centerLine.position.y = 0;
  scene.add(centerLine);

  const sideLine1Material = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.8,
  });
  const sideLine1 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.15),
    sideLine1Material,
  );
  sideLine1.position.set(0, 0, TABLE_LENGTH / 2);
  scene.add(sideLine1);

  const sideLine2 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.15),
    sideLine1Material,
  );
  sideLine2.position.set(0, 0, -TABLE_LENGTH / 2);
  scene.add(sideLine2);

  // Zauberstab 1 (vorne) - Blauer Wizard
  const paddleGeometry = new THREE.BoxGeometry(
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    0.3,
  );
  const paddle1Material = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x0080ff,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.8,
  });
  paddle1 = new THREE.Mesh(paddleGeometry, paddle1Material);
  paddle1.position.set(0, 0, TABLE_LENGTH / 2 + 1);
  paddle1.castShadow = true;
  scene.add(paddle1);

  // Aura für Zauberstab 1
  const aura1Geometry = new THREE.SphereGeometry(PADDLE_HEIGHT / 2, 16, 16);
  const aura1Material = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });
  const aura1 = new THREE.Mesh(aura1Geometry, aura1Material);
  paddle1.add(aura1);

  // Zauberstab 2 (hinten) - Roter Wizard
  const paddle2Material = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.8,
  });
  paddle2 = new THREE.Mesh(paddleGeometry, paddle2Material);
  paddle2.position.set(0, 0, -(TABLE_LENGTH / 2 + 1));
  paddle2.castShadow = true;
  scene.add(paddle2);

  // Aura für Zauberstab 2
  const aura2Geometry = new THREE.SphereGeometry(PADDLE_HEIGHT / 2, 16, 16);
  const aura2Material = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });
  const aura2 = new THREE.Mesh(aura2Geometry, aura2Material);
  paddle2.add(aura2);

  // Magische Energie-Sphäre (Ball)
  const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffa500,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.9,
  });
  ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, 2, 0);
  ball.castShadow = true;
  scene.add(ball);

  // Äußere Glüh-Sphäre
  const glowBallGeometry = new THREE.SphereGeometry(BALL_RADIUS * 1.5, 32, 32);
  const glowBallMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide,
  });
  const glowBall = new THREE.Mesh(glowBallGeometry, glowBallMaterial);
  ball.add(glowBall);

  // Erstelle Partikelsystem
  createParticles();

  // Responsive
  window.addEventListener("resize", onWindowResize);

  // Mausbewegung
  window.addEventListener("mousemove", onMouseMove);
}

// Erstelle Sternenhimmel
function createStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];

  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = Math.random() * 100 + 20;
    const z = (Math.random() - 0.5) * 200;
    starVertices.push(x, y, z);
  }

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3),
  );

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.8,
  });

  const starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);
  stars.push(starField);
}

// Erstelle Partikelsystem
function createParticles() {
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xffd700 : 0xff00ff,
      transparent: true,
      opacity: 0.7,
    });

    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    particle.userData = {
      velocity: {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1,
      },
      life: Math.random() * 100,
    };

    particles.push(particle);
    scene.add(particle);
  }
}

// Aktualisiere Partikel
function updateParticles() {
  particles.forEach((particle) => {
    // Folge dem Ball
    const toBall = new THREE.Vector3(
      ball.position.x - particle.position.x,
      ball.position.y - particle.position.y,
      ball.position.z - particle.position.z,
    );
    toBall.normalize();
    toBall.multiplyScalar(0.05);

    particle.position.x += particle.userData.velocity.x + toBall.x;
    particle.position.y += particle.userData.velocity.y + toBall.y;
    particle.position.z += particle.userData.velocity.z + toBall.z;

    // Lebenszyklus
    particle.userData.life++;
    if (particle.userData.life > 100) {
      particle.position.copy(ball.position);
      particle.userData.life = 0;
      particle.material.color.setHex(Math.random() > 0.5 ? 0xffd700 : 0xff00ff);
    }

    // Fade-Effekt
    particle.material.opacity = 1 - particle.userData.life / 100;
  });
}

function onMouseMove(event) {
  // Normalisiere Mausposition zu 3D-Koordinaten
  mouseX = ((event.clientX / window.innerWidth) * 2 - 1) * (TABLE_WIDTH / 2);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// CPU AI für Schläger 1 (vorne)
function updateCPU1() {
  const prediction = ball.position.z > 0 ? ball.position.x : 0;
  const diff = prediction - paddle1.position.x;

  if (Math.abs(diff) > 0.5) {
    gameState.paddle1.velocity = Math.sign(diff) * gameState.paddle1.speed;
  } else {
    gameState.paddle1.velocity = diff * 0.3;
  }

  paddle1.position.x += gameState.paddle1.velocity;

  // Begrenzungen
  const maxX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
  if (paddle1.position.x < -maxX) paddle1.position.x = -maxX;
  if (paddle1.position.x > maxX) paddle1.position.x = maxX;
}

// CPU AI für Schläger 2 (hinten)
function updateCPU2() {
  const prediction = ball.position.z < 0 ? ball.position.x : 0;
  const diff = prediction - paddle2.position.x;

  if (Math.abs(diff) > 0.5) {
    gameState.paddle2.velocity = Math.sign(diff) * gameState.paddle2.speed;
  } else {
    gameState.paddle2.velocity = diff * 0.3;
  }

  paddle2.position.x += gameState.paddle2.velocity;

  // Begrenzungen
  const maxX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
  if (paddle2.position.x < -maxX) paddle2.position.x = -maxX;
  if (paddle2.position.x > maxX) paddle2.position.x = maxX;
}

// Ball-Update
function updateBall() {
  // Position aktualisieren
  ball.position.x += gameState.ball.velocity.x;
  ball.position.z += gameState.ball.velocity.z;

  // Ball bleibt auf konstanter Höhe
  ball.position.y = BALL_RADIUS;

  // Seitenkollisionen
  if (Math.abs(ball.position.x) >= TABLE_WIDTH / 2) {
    gameState.ball.velocity.x *= -0.9;
    ball.position.x = Math.sign(ball.position.x) * (TABLE_WIDTH / 2);
  }

  // Schläger 1 Kollision (vorne)
  if (
    ball.position.z >= TABLE_LENGTH / 2 &&
    ball.position.z <= TABLE_LENGTH / 2 + 1 &&
    Math.abs(ball.position.x - paddle1.position.x) <=
      PADDLE_WIDTH / 2 + BALL_RADIUS &&
    ball.position.y <= PADDLE_HEIGHT / 2 + BALL_RADIUS
  ) {
    gameState.ball.velocity.z = -Math.abs(gameState.ball.velocity.z) * 1.05;
    gameState.ball.velocity.x += (ball.position.x - paddle1.position.x) * 0.15;
    ball.position.z = TABLE_LENGTH / 2;
  }

  // Schläger 2 Kollision (hinten)
  if (
    ball.position.z <= -(TABLE_LENGTH / 2) &&
    ball.position.z >= -(TABLE_LENGTH / 2 + 1) &&
    Math.abs(ball.position.x - paddle2.position.x) <=
      PADDLE_WIDTH / 2 + BALL_RADIUS &&
    ball.position.y <= PADDLE_HEIGHT / 2 + BALL_RADIUS
  ) {
    gameState.ball.velocity.z = Math.abs(gameState.ball.velocity.z) * 1.05;
    gameState.ball.velocity.x += (ball.position.x - paddle2.position.x) * 0.15;
    ball.position.z = -(TABLE_LENGTH / 2);
  }

  // Punktzählung
  if (ball.position.z > TABLE_LENGTH / 2 + 5 || ball.position.y < -5) {
    gameState.score2++;
    updateScore();
    resetBall();
  } else if (
    ball.position.z < -(TABLE_LENGTH / 2 + 5) ||
    ball.position.y < -5
  ) {
    gameState.score1++;
    updateScore();
    resetBall();
  }

  // Ball-Licht Position aktualisieren
  ballLight.position.copy(ball.position);
}

// Ball zurücksetzen
function resetBall() {
  ball.position.set(0, BALL_RADIUS, 0);
  const direction = Math.random() > 0.5 ? 1 : -1;
  gameState.ball.velocity = {
    x: (Math.random() - 0.5) * 0.1,
    z: direction * 0.15,
  };
}

// Punktestand aktualisieren
function updateScore() {
  document.getElementById("score1").textContent = gameState.score1;
  document.getElementById("score2").textContent = gameState.score2;

  if (gameState.score1 >= WINNING_SCORE || gameState.score2 >= WINNING_SCORE) {
    const winner = gameState.score1 >= WINNING_SCORE ? "CPU 1" : "CPU 2";
    setTimeout(() => {
      alert(`${winner} gewinnt! 🏆`);
      resetGame();
    }, 100);
  }
}

// Render-Funktion
function render() {
  renderer.render(scene, camera);
}

// Spiel-Loop
function gameLoop() {
  if (isManualMode) {
    // Manuelle Steuerung
    const maxX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
    paddle1.position.x = Math.max(-maxX, Math.min(maxX, mouseX));
  } else {
    // CPU-Steuerung
    updateCPU1();
  }
  updateCPU2();
  updateBall();
  updateParticles();

  // Rotiere die Sterne leicht
  stars.forEach((starField) => {
    starField.rotation.y += 0.0001;
  });

  // Animiere Zauberstab-Auren
  if (paddle1.children[0]) {
    paddle1.children[0].scale.set(
      1 + Math.sin(Date.now() * 0.003) * 0.1,
      1 + Math.sin(Date.now() * 0.003) * 0.1,
      1 + Math.sin(Date.now() * 0.003) * 0.1,
    );
  }
  if (paddle2.children[0]) {
    paddle2.children[0].scale.set(
      1 + Math.sin(Date.now() * 0.003 + Math.PI) * 0.1,
      1 + Math.sin(Date.now() * 0.003 + Math.PI) * 0.1,
      1 + Math.sin(Date.now() * 0.003 + Math.PI) * 0.1,
    );
  }

  // Animiere Ball-Glow
  if (ball.children[0]) {
    ball.children[0].scale.set(
      1 + Math.sin(Date.now() * 0.005) * 0.2,
      1 + Math.sin(Date.now() * 0.005) * 0.2,
      1 + Math.sin(Date.now() * 0.005) * 0.2,
    );
  }

  render();
  requestAnimationFrame(gameLoop);
}

// Spiel zurücksetzen
function resetGame() {
  gameState.score1 = 0;
  gameState.score2 = 0;
  updateScore();
  resetBall();
  paddle1.position.x = 0;
  paddle2.position.x = 0;
}

// Spielmodus wechseln
function togglePlayMode() {
  isManualMode = !isManualMode;
  playModeButton.classList.toggle("active");

  if (isManualMode) {
    playModeButton.textContent = "⚔️ AI-Modus";
    document.getElementById("score1").previousElementSibling.textContent =
      "⭐ DU";
  } else {
    playModeButton.textContent = "⚔️ Kämpfen";
    document.getElementById("score1").previousElementSibling.textContent =
      "🔮 WIZARD BLUE";
  }
}

// Event-Listener
resetButton.addEventListener("click", resetGame);
playModeButton.addEventListener("click", togglePlayMode);

// Spiel starten
document.addEventListener("DOMContentLoaded", () => {
  console.log("3D Tischtennis-Spiel gestartet!");
  initScene();
  resetBall();
  updateScore();
  gameLoop();
});
