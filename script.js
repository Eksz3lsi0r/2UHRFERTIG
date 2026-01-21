// Three.js Setup
let scene, camera, renderer;
let ball, paddle1, paddle2, table, ballLight;
const playModeButton = document.getElementById("playModeButton");
const speedToggleButton = document.getElementById("speedToggleButton");

// Mausposition
let mouseX = 0;
let isManualMode = false;
let gameSpeed = 1;

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
  scene.background = new THREE.Color(0x0a0a15);
  scene.fog = new THREE.Fog(0x0a0a15, 30, 60);

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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
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

  // Ball-Licht
  ballLight = new THREE.PointLight(0x764ba2, 1, 10);
  scene.add(ballLight);

  // Tisch
  const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_LENGTH);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a5f3f,
    roughness: 0.3,
    metalness: 0.1,
  });
  table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.y = -0.25;
  table.receiveShadow = true;
  scene.add(table);

  // Tischlinien
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.51, TABLE_LENGTH),
    lineMaterial,
  );
  centerLine.position.y = 0;
  scene.add(centerLine);

  const sideLine1 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.1),
    lineMaterial,
  );
  sideLine1.position.set(0, 0, TABLE_LENGTH / 2);
  scene.add(sideLine1);

  const sideLine2 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.51, 0.1),
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
  for (let i = 0; i < gameSpeed; i++) {
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

  const player1Label = document.querySelector(".player1 .player-label");
  const btnText = playModeButton.querySelector(".btn-text");

  if (isManualMode) {
    btnText.textContent = "CPU-Modus";
    player1Label.textContent = "SPIELER";
  } else {
    btnText.textContent = "Selbst spielen";
    player1Label.textContent = "CPU 1";
  }
}

// Geschwindigkeit wechseln
function toggleSpeed() {
  // Zyklus: 1 -> 2 -> 3 -> 4 -> 5 -> 1
  gameSpeed = gameSpeed >= 5 ? 1 : gameSpeed + 1;

  speedToggleButton.dataset.speed = gameSpeed;
  const speedLabel = speedToggleButton.querySelector(".speed-label");
  speedLabel.textContent = `x${gameSpeed}`;

  // Visuelles Feedback
  speedToggleButton.style.transform = "scale(1.2)";
  setTimeout(() => {
    speedToggleButton.style.transform = "";
  }, 200);
}

// Event-Listener
playModeButton.addEventListener("click", togglePlayMode);
speedToggleButton.addEventListener("click", toggleSpeed);

// Spiel starten
document.addEventListener("DOMContentLoaded", () => {
  console.log("3D Tischtennis-Spiel gestartet!");
  initScene();
  resetBall();
  updateScore();
  gameLoop();
});
