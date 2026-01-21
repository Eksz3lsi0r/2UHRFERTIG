// Three.js Setup
let scene, camera, renderer;
let ball, paddle1, paddle2, table, ballLight;
let arenaWalls = [];
let arenaFloor, arenaCeiling;
let particles = [];
let ballTrail = [];
let spotlights = [];
let timeSprite;
let frameCounter = 0;
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
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.Fog(0x050510, 35, 70);

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

  // Arena-Boden
  createArenaFloor();

  // Arena-Wände
  createArenaWalls();

  // Arena-Decke
  createArenaCeiling();

  // Lichter
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);

  // Arena Spotlights
  createArenaSpotlights();

  // Ball-Licht
  ballLight = new THREE.PointLight(0x764ba2, 2, 15);
  ballLight.castShadow = true;
  scene.add(ballLight);

  // Tisch
  const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_LENGTH);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d3d2a,
    roughness: 0.2,
    metalness: 0.4,
    emissive: 0x0a2f1f,
    emissiveIntensity: 0.2,
  });
  table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.y = -0.25;
  table.receiveShadow = true;
  scene.add(table);

  // Tischlinien mit Glow
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.8,
  });
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.51, TABLE_LENGTH),
    lineMaterial,
  );
  centerLine.position.y = 0;
  scene.add(centerLine);

  const sideLine1 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.15),
    lineMaterial,
  );
  sideLine1.position.set(0, 0, TABLE_LENGTH / 2);
  scene.add(sideLine1);

  const sideLine2 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.15),
    lineMaterial,
  );
  sideLine2.position.set(0, 0, -TABLE_LENGTH / 2);
  scene.add(sideLine2);

  // Schläger 1 (vorne)
  const paddleGeometry = new THREE.BoxGeometry(
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    0.3,
  );
  const paddle1Material = new THREE.MeshStandardMaterial({
    color: 0x667eea,
    emissive: 0x667eea,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  paddle1 = new THREE.Mesh(paddleGeometry, paddle1Material);
  paddle1.position.set(0, 0, TABLE_LENGTH / 2 + 1);
  paddle1.castShadow = true;
  scene.add(paddle1);

  // Schläger 2 (hinten)
  const paddle2Material = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    emissive: 0xff6b6b,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  paddle2 = new THREE.Mesh(paddleGeometry, paddle2Material);
  paddle2.position.set(0, 0, -(TABLE_LENGTH / 2 + 1));
  paddle2.castShadow = true;
  scene.add(paddle2);

  // Ball
  const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.8,
  });
  ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, 2, 0);
  ball.castShadow = true;
  scene.add(ball);

  // Zeitanzeige über dem Ball
  createTimeDisplay();

  // Responsive
  window.addEventListener("resize", onWindowResize);

  // Mausbewegung
  window.addEventListener("mousemove", onMouseMove);
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

  // Ball-Trail Effekt
  createBallTrail();

  // Zeitanzeige aktualisieren
  updateTimeDisplay();

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
    createHitParticles(ball.position, 0x667eea);
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
    createHitParticles(ball.position, 0xff6b6b);
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
  updateParticles();
  updateBallTrail();
  updateSpotlights();
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
    playModeButton.textContent = "CPU-Modus";
    document.getElementById("score1").previousElementSibling.textContent =
      "SPIELER";
  } else {
    playModeButton.textContent = "Selbst Spielen";
    document.getElementById("score1").previousElementSibling.textContent =
      "CPU 1";
  }
}

// Event-Listener
resetButton.addEventListener("click", resetGame);
playModeButton.addEventListener("click", togglePlayMode);

// Arena-Boden erstellen
function createArenaFloor() {
  const floorGeometry = new THREE.CircleGeometry(50, 64);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a15,
    roughness: 0.8,
    metalness: 0.2,
    emissive: 0x1a1a3a,
    emissiveIntensity: 0.1,
  });
  arenaFloor = new THREE.Mesh(floorGeometry, floorMaterial);
  arenaFloor.rotation.x = -Math.PI / 2;
  arenaFloor.position.y = -5;
  arenaFloor.receiveShadow = true;
  scene.add(arenaFloor);
}

// Arena-Wände erstellen
function createArenaWalls() {
  const wallHeight = 20;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f20,
    roughness: 0.7,
    metalness: 0.3,
    emissive: 0x1a1a4a,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.7,
  });

  // Wand hinten
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(60, wallHeight, 0.5),
    wallMaterial,
  );
  backWall.position.set(0, wallHeight / 2 - 5, -35);
  backWall.receiveShadow = true;
  scene.add(backWall);
  arenaWalls.push(backWall);

  // Wand vorne
  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(60, wallHeight, 0.5),
    wallMaterial,
  );
  frontWall.position.set(0, wallHeight / 2 - 5, 35);
  frontWall.receiveShadow = true;
  scene.add(frontWall);
  arenaWalls.push(frontWall);

  // Wand links
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, wallHeight, 70),
    wallMaterial,
  );
  leftWall.position.set(-30, wallHeight / 2 - 5, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);
  arenaWalls.push(leftWall);

  // Wand rechts
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, wallHeight, 70),
    wallMaterial,
  );
  rightWall.position.set(30, wallHeight / 2 - 5, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);
  arenaWalls.push(rightWall);

  // Leuchtende Kanten
  createGlowingEdges();
}

// Arena-Decke erstellen
function createArenaCeiling() {
  const ceilingGeometry = new THREE.CircleGeometry(50, 64);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a15,
    roughness: 0.9,
    metalness: 0.1,
    emissive: 0x0f0f1f,
    emissiveIntensity: 0.05,
    transparent: true,
    opacity: 0.3,
  });
  arenaCeiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  arenaCeiling.rotation.x = Math.PI / 2;
  arenaCeiling.position.y = 20;
  scene.add(arenaCeiling);
}

// Leuchtende Kanten
function createGlowingEdges() {
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x667eea,
    transparent: true,
    opacity: 0.6,
  });

  const positions = [
    [0, -4.8, -35],
    [0, -4.8, 35],
    [-30, -4.8, 0],
    [30, -4.8, 0],
  ];

  const sizes = [
    [60, 0.2, 0.5],
    [60, 0.2, 0.5],
    [0.5, 0.2, 70],
    [0.5, 0.2, 70],
  ];

  for (let i = 0; i < positions.length; i++) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(...sizes[i]),
      edgeMaterial,
    );
    edge.position.set(...positions[i]);
    scene.add(edge);
  }
}

// Arena Spotlights
function createArenaSpotlights() {
  const spotlightPositions = [
    { x: -15, z: -15 },
    { x: 15, z: -15 },
    { x: -15, z: 15 },
    { x: 15, z: 15 },
  ];

  spotlightPositions.forEach((pos, index) => {
    const spotlight = new THREE.SpotLight(
      index % 2 === 0 ? 0x667eea : 0xff6b6b,
      0.8,
      40,
      Math.PI / 6,
      0.5,
      1,
    );
    spotlight.position.set(pos.x, 18, pos.z);
    spotlight.target.position.set(pos.x, 0, pos.z);
    spotlight.castShadow = true;
    scene.add(spotlight);
    scene.add(spotlight.target);
    spotlights.push(spotlight);
  });
}

// Spotlight Animation
function updateSpotlights() {
  const time = Date.now() * 0.001;
  spotlights.forEach((light, index) => {
    light.intensity = 0.5 + Math.sin(time + index) * 0.3;
  });
}

// Partikeleffekte bei Schlag
function createHitParticles(position, color) {
  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1,
      }),
    );
    particle.position.copy(position);
    particle.velocity = {
      x: (Math.random() - 0.5) * 0.3,
      y: Math.random() * 0.3,
      z: (Math.random() - 0.5) * 0.3,
    };
    particle.life = 1;
    scene.add(particle);
    particles.push(particle);
  }
}

// Partikel aktualisieren
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.position.x += particle.velocity.x;
    particle.position.y += particle.velocity.y;
    particle.position.z += particle.velocity.z;
    particle.velocity.y -= 0.01; // Schwerkraft
    particle.life -= 0.02;
    particle.material.opacity = particle.life;

    if (particle.life <= 0) {
      scene.remove(particle);
      particles.splice(i, 1);
    }
  }
}

// Ball-Trail erstellen
function createBallTrail() {
  if (Math.random() > 0.7) {
    const trail = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 0.5, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      }),
    );
    trail.position.copy(ball.position);
    trail.life = 1;
    scene.add(trail);
    ballTrail.push(trail);
  }
}

// Ball-Trail aktualisieren
function updateBallTrail() {
  for (let i = ballTrail.length - 1; i >= 0; i--) {
    const trail = ballTrail[i];
    trail.life -= 0.05;
    trail.material.opacity = trail.life * 0.5;
    trail.scale.set(trail.life, trail.life, trail.life);

    if (trail.life <= 0) {
      scene.remove(trail);
      ballTrail.splice(i, 1);
    }
  }
}

// Zeitanzeige erstellen
function createTimeDisplay() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  timeSprite = new THREE.Sprite(spriteMaterial);
  timeSprite.scale.set(4, 2, 1);
  timeSprite.renderOrder = 999;
  scene.add(timeSprite);
}

// Zeitanzeige aktualisieren
function updateTimeDisplay() {
  if (!timeSprite) return;

  // Position über dem Ball (immer aktualisieren für glatte Bewegung)
  timeSprite.position.set(
    ball.position.x,
    ball.position.y + 2.5,
    ball.position.z,
  );

  // Canvas nur alle 5 Frames aktualisieren (Performance-Optimierung)
  frameCounter++;
  if (frameCounter % 5 !== 0) return;

  // Berechne Zeit bis zum nächsten Schläger
  let timeToImpact = 0;

  if (gameState.ball.velocity.z > 0) {
    // Ball bewegt sich zu Paddle1 (vorne)
    const distance = TABLE_LENGTH / 2 + 1 - ball.position.z;
    timeToImpact = distance / Math.abs(gameState.ball.velocity.z);
  } else if (gameState.ball.velocity.z < 0) {
    // Ball bewegt sich zu Paddle2 (hinten)
    const distance = ball.position.z - -(TABLE_LENGTH / 2 + 1);
    timeToImpact = distance / Math.abs(gameState.ball.velocity.z);
  }

  // Konvertiere zu Sekunden (60 FPS angenommen)
  const secondsToImpact = (timeToImpact / 60).toFixed(2);

  // Canvas aktualisieren
  const canvas = timeSprite.material.map.image;
  const context = canvas.getContext("2d");

  // Canvas löschen
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Hintergrund ohne Blur für Schärfe
  context.fillStyle = "rgba(10, 10, 30, 0.9)";
  context.roundRect(40, 60, canvas.width - 80, canvas.height - 120, 20);
  context.fill();

  // Rand mit Glow
  context.strokeStyle = "rgba(102, 126, 234, 0.8)";
  context.lineWidth = 4;
  context.stroke();

  // Zeit-Text (scharf und klar)
  context.fillStyle = "#ffffff";
  context.font = "bold 100px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(secondsToImpact + "s", canvas.width / 2, canvas.height / 2);

  // Textur aktualisieren
  timeSprite.material.map.needsUpdate = true;
}

// Spiel starten
document.addEventListener("DOMContentLoaded", () => {
  console.log("3D Tischtennis-Spiel gestartet!");
  initScene();
  resetBall();
  updateScore();
  gameLoop();
});
