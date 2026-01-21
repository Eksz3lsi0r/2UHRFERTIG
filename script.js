// Three.js Setup
let scene, camera, renderer;
let ball, paddle1, paddle2, table, ballLight;
const playModeButton = document.getElementById("playModeButton");
const speedToggleButton = document.getElementById("speedToggleButton");
const pvpModeButton = document.getElementById("pvpModeButton");
const matchmakingOverlay = document.getElementById("matchmakingOverlay");
const cancelMatchmakingButton = document.getElementById("cancelMatchmaking");

// WebSocket & PvP State
let ws = null;
let isPvPMode = false;
let myPlayerNumber = null;
let isMatchFound = false;

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
    velocity: { x: 0.3, z: 0.24 },
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
  scene.fog = new THREE.Fog(0x0a0a15, 30, 70);

  // Kamera - responsive für mobile Geräte
  const isMobile = window.innerWidth < 768;
  const initialFov = isMobile ? 85 : 75;
  const initialDistance = isMobile ? 32 : 28;
  const initialHeight = isMobile ? 18 : 15;

  camera = new THREE.PerspectiveCamera(
    initialFov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, initialHeight, initialDistance);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lichter
  const ambientLight = new THREE.AmbientLight(0x4a5b8f, 0.3);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x667eea, 0.5);
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
  ballLight = new THREE.PointLight(0xffffff, 1.5, 15);
  scene.add(ballLight);

  // Tisch
  const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_LENGTH);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d4d35,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x0a3d2a,
    emissiveIntensity: 0.3,
  });
  table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.y = -0.25;
  table.receiveShadow = true;
  scene.add(table);

  // Neon-Glow um den Tisch
  const glowGeometry = new THREE.BoxGeometry(
    TABLE_WIDTH + 0.5,
    0.6,
    TABLE_LENGTH + 0.5,
  );
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
  });
  const tableGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  tableGlow.position.y = -0.25;
  scene.add(tableGlow);

  // Tischlinien
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.9,
  });
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.52, TABLE_LENGTH),
    lineMaterial,
  );
  centerLine.position.y = 0;
  scene.add(centerLine);

  const sideLine1 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.52, 0.15),
    lineMaterial,
  );
  sideLine1.position.set(0, 0, TABLE_LENGTH / 2);
  scene.add(sideLine1);

  const sideLine2 = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_WIDTH, 0.52, 0.15),
    lineMaterial,
  );
  sideLine2.position.set(0, 0, -TABLE_LENGTH / 2);
  scene.add(sideLine2);

  // Zusätzliche Neon-Glow-Linien
  const glowLineMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.3,
  });

  const centerGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.55, TABLE_LENGTH),
    glowLineMaterial,
  );
  centerGlow.position.y = 0;
  scene.add(centerGlow);

  // Schläger 1 (vorne)
  const paddleGeometry = new THREE.BoxGeometry(
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    0.3,
  );
  const paddle1Material = new THREE.MeshStandardMaterial({
    color: 0x00f2fe,
    emissive: 0x00f2fe,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.7,
  });
  paddle1 = new THREE.Mesh(paddleGeometry, paddle1Material);
  paddle1.position.set(0, 0, TABLE_LENGTH / 2 + 1);
  paddle1.castShadow = true;
  scene.add(paddle1);

  // Neon-Glow für Schläger 1
  const paddle1GlowGeometry = new THREE.BoxGeometry(
    PADDLE_WIDTH + 0.3,
    PADDLE_HEIGHT + 0.3,
    0.4,
  );
  const paddle1GlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.3,
  });
  const paddle1Glow = new THREE.Mesh(paddle1GlowGeometry, paddle1GlowMaterial);
  paddle1.add(paddle1Glow);

  // Schläger 2 (hinten)
  const paddle2Material = new THREE.MeshStandardMaterial({
    color: 0xf093fb,
    emissive: 0xf093fb,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.7,
  });
  paddle2 = new THREE.Mesh(paddleGeometry, paddle2Material);
  paddle2.position.set(0, 0, -(TABLE_LENGTH / 2 + 1));
  paddle2.castShadow = true;
  scene.add(paddle2);

  // Neon-Glow für Schläger 2
  const paddle2GlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xf093fb,
    transparent: true,
    opacity: 0.3,
  });
  const paddle2Glow = new THREE.Mesh(paddle1GlowGeometry, paddle2GlowMaterial);
  paddle2.add(paddle2Glow);

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

  // Touch-Events für Mobile
  window.addEventListener("touchstart", onTouchMove, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
}

function onMouseMove(event) {
  // Normalisiere Mausposition zu 3D-Koordinaten
  mouseX = ((event.clientX / window.innerWidth) * 2 - 1) * (TABLE_WIDTH / 2);
}

function onTouchMove(event) {
  // Verhindere Standard-Scroll-Verhalten
  event.preventDefault();

  if (event.touches.length > 0) {
    const touch = event.touches[0];
    // Normalisiere Touch-Position zu 3D-Koordinaten (gleich wie Maus)
    mouseX = ((touch.clientX / window.innerWidth) * 2 - 1) * (TABLE_WIDTH / 2);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Passe Kamera-Zoom für mobile Geräte an
  if (window.innerWidth < 768) {
    // Mobile: Kleinerer Bildschirm, mehr Abstand
    camera.fov = 85;
  } else {
    // Desktop: Standard FOV
    camera.fov = 75;
  }
  camera.updateProjectionMatrix();
}

// Kamera-Perspektive für Spieler anpassen
function setCameraForPlayer(playerNumber) {
  // Dynamische Kamera-Position basierend auf Bildschirmgröße
  const isMobile = window.innerWidth < 768;
  const distance = isMobile ? 32 : 28;
  const height = isMobile ? 18 : 15;

  if (playerNumber === 2) {
    // Kamera für Spieler 2 (hinten) - dreht Ansicht um 180°
    camera.position.set(0, height, -distance);
    camera.lookAt(0, 0, 0);
  } else {
    // Standard-Kamera für Spieler 1 (vorne)
    camera.position.set(0, height, distance);
    camera.lookAt(0, 0, 0);
  }
}

// CPU AI für Schläger 1 (vorne)
function updateCPU1() {
  // Im PvP-Modus: Nur CPU wenn ich Spieler 2 bin, sonst wird Gegner synchronisiert
  if (isPvPMode && myPlayerNumber === 1) {
    return; // Spieler 1 steuert manuell
  }

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
  // Im PvP-Modus: Nur CPU wenn ich Spieler 1 bin, sonst wird Gegner synchronisiert
  if (isPvPMode && myPlayerNumber === 2) {
    return; // Spieler 2 steuert manuell
  }

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
  // Im PvP-Modus: Nur Spieler 1 berechnet Ball-Physik
  if (isPvPMode && myPlayerNumber !== 1) {
    return; // Spieler 2 erhält Ball-Updates vom Server
  }

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
    sendScoreUpdate(); // PvP: Synchronisiere Score
    resetBall();
  } else if (
    ball.position.z < -(TABLE_LENGTH / 2 + 5) ||
    ball.position.y < -5
  ) {
    gameState.score1++;
    updateScore();
    sendScoreUpdate(); // PvP: Synchronisiere Score
    resetBall();
  }

  // Ball-Licht Position aktualisieren
  ballLight.position.copy(ball.position);

  // PvP: Sende Ball-Updates
  if (isPvPMode && myPlayerNumber === 1) {
    sendBallUpdate();
  }
}

// 3D Neon-Gitter Effekt erstellen
function createNeonGrid() {
  const gridHelper = new THREE.GridHelper(60, 30, 0x00f2fe, 0x667eea);
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  gridHelper.position.y = -0.5;
  scene.add(gridHelper);

  // Vertikales Gitter für Wände
  const verticalGrid1 = new THREE.GridHelper(40, 20, 0xf093fb, 0x764ba2);
  verticalGrid1.material.opacity = 0.1;
  verticalGrid1.material.transparent = true;
  verticalGrid1.rotation.x = Math.PI / 2;
  verticalGrid1.position.set(TABLE_WIDTH / 2 + 5, 10, 0);
  scene.add(verticalGrid1);

  const verticalGrid2 = new THREE.GridHelper(40, 20, 0xf093fb, 0x764ba2);
  verticalGrid2.material.opacity = 0.1;
  verticalGrid2.material.transparent = true;
  verticalGrid2.rotation.x = Math.PI / 2;
  verticalGrid2.position.set(-TABLE_WIDTH / 2 - 5, 10, 0);
  scene.add(verticalGrid2);

  // Neon-Linien um den Tisch
  const neonLineMaterial = new THREE.LineBasicMaterial({
    color: 0x00f2fe,
    linewidth: 2,
  });

  const points = [];
  points.push(new THREE.Vector3(-TABLE_WIDTH / 2, 0, -TABLE_LENGTH / 2));
  points.push(new THREE.Vector3(TABLE_WIDTH / 2, 0, -TABLE_LENGTH / 2));
  points.push(new THREE.Vector3(TABLE_WIDTH / 2, 0, TABLE_LENGTH / 2));
  points.push(new THREE.Vector3(-TABLE_WIDTH / 2, 0, TABLE_LENGTH / 2));
  points.push(new THREE.Vector3(-TABLE_WIDTH / 2, 0, -TABLE_LENGTH / 2));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const neonBorder = new THREE.Line(geometry, neonLineMaterial);
  scene.add(neonBorder);
}

// Ball zurücksetzen
function resetBall() {
  ball.position.set(0, BALL_RADIUS, 0);
  const direction = Math.random() > 0.5 ? 1 : -1;
  gameState.ball.velocity = {
    x: (Math.random() - 0.5) * 0.2,
    z: direction * 0.3,
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
  // Animiere Ball-Licht Intensität
  const time = Date.now() * 0.001;
  ballLight.intensity = 1 + Math.sin(time * 3) * 0.3;

  renderer.render(scene, camera);
}

// Spiel-Loop
function gameLoop() {
  for (let i = 0; i < gameSpeed; i++) {
    if (isPvPMode) {
      // PvP-Modus: Steuere meinen Schläger
      const myPaddle = myPlayerNumber === 1 ? paddle1 : paddle2;
      const maxX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
      // Invertiere Steuerung für Spieler 2 (gedrehte Kamera)
      const controlX = myPlayerNumber === 2 ? -mouseX : mouseX;
      myPaddle.position.x = Math.max(-maxX, Math.min(maxX, controlX));

      // Sende Schläger-Update an Server
      sendPaddleUpdate(myPaddle.position.x);

      // Gegner-Schläger wird über WebSocket aktualisiert
      if (myPlayerNumber === 1) {
        updateCPU2(); // Gegner CPU (wenn nicht verbunden)
      } else {
        updateCPU1(); // Gegner CPU (wenn nicht verbunden)
      }
    } else if (isManualMode) {
      // Manuelle Steuerung (Einzelspieler)
      const maxX = TABLE_WIDTH / 2 - PADDLE_WIDTH / 2;
      paddle1.position.x = Math.max(-maxX, Math.min(maxX, mouseX));
      updateCPU2();
    } else {
      // CPU-Steuerung (beide KI)
      updateCPU1();
      updateCPU2();
    }

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
  // Im PvP-Modus nicht verfügbar
  if (isPvPMode) {
    return;
  }

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

// Event-Listener (Click + Touch für Mobile)
playModeButton.addEventListener("click", togglePlayMode);
playModeButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  togglePlayMode();
});

speedToggleButton.addEventListener("click", toggleSpeed);
speedToggleButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  toggleSpeed();
});

pvpModeButton.addEventListener("click", startPvPMatchmaking);
pvpModeButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  startPvPMatchmaking();
});

cancelMatchmakingButton.addEventListener("click", cancelMatchmaking);
cancelMatchmakingButton.addEventListener("touchend", (e) => {
  e.preventDefault();
  cancelMatchmaking();
});

// ===== WEBSOCKET & PVP FUNKTIONEN =====

function startPvPMatchmaking() {
  if (isPvPMode) {
    // Verlasse PvP-Modus
    leavePvPMode();
    return;
  }

  // Verbinde zum WebSocket Server
  // Automatische Erkennung: Lokal oder Render.com
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("🔌 Mit Server verbunden");
    // Zeige Matchmaking Overlay
    matchmakingOverlay.classList.remove("hidden");
    pvpModeButton.classList.add("active");

    // Suche nach Match
    ws.send(JSON.stringify({ type: "find_match" }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  };

  ws.onclose = () => {
    console.log("❌ Verbindung zum Server getrennt");
    if (isPvPMode) {
      alert("Verbindung zum Server verloren!");
      leavePvPMode();
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket Fehler:", error);
    alert(
      'Fehler bei der Verbindung zum Server. Starte den Server mit "npm start"',
    );
    matchmakingOverlay.classList.add("hidden");
    pvpModeButton.classList.remove("active");
  };
}

function handleServerMessage(data) {
  switch (data.type) {
    case "waiting":
      console.log("⏳ Warte auf Gegner...");
      break;

    case "match_found":
      console.log(`✅ Match gefunden! Du bist Spieler ${data.playerNumber}`);
      myPlayerNumber = data.playerNumber;
      isMatchFound = true;
      isPvPMode = true;

      // Verstecke Overlay
      matchmakingOverlay.classList.add("hidden");

      // Setze Spieler-Labels
      const player1Label = document.querySelector(".player1 .player-label");
      const player2Label = document.querySelector(".player2 .player-label");

      if (myPlayerNumber === 1) {
        player1Label.textContent = "DU";
        player2Label.textContent = "GEGNER";
      } else {
        player1Label.textContent = "GEGNER";
        player2Label.textContent = "DU";
      }

      // Deaktiviere andere Buttons
      playModeButton.disabled = true;
      speedToggleButton.disabled = true;

      // Verstecke alle Control-Buttons während PvP
      speedToggleButton.style.display = "none";
      playModeButton.style.display = "none";
      pvpModeButton.style.display = "none";

      // Passe Kamera für Spieler an
      setCameraForPlayer(myPlayerNumber);

      // Setze Spiel zurück
      resetGame();
      break;

    case "opponent_paddle":
      // Aktualisiere Gegner-Schläger
      if (data.playerNumber !== myPlayerNumber) {
        const opponentPaddle = myPlayerNumber === 1 ? paddle2 : paddle1;
        opponentPaddle.position.x = data.position.x;
      }
      break;

    case "ball_sync":
      // Synchronisiere Ball (nur für nicht-autorisierten Spieler)
      if (myPlayerNumber === 2) {
        ball.position.x = data.position.x;
        ball.position.y = data.position.y;
        ball.position.z = data.position.z;
        gameState.ball.velocity.x = data.velocity.x;
        gameState.ball.velocity.z = data.velocity.z;
      }
      break;

    case "score_sync":
      gameState.score1 = data.score1;
      gameState.score2 = data.score2;
      updateScore();
      break;

    case "opponent_left":
      alert("Gegner hat das Spiel verlassen!");
      leavePvPMode();
      break;
  }
}

function cancelMatchmaking() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  matchmakingOverlay.classList.add("hidden");
  pvpModeButton.classList.remove("active");
}

function leavePvPMode() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "leave_game" }));
    ws.close();
  }

  ws = null;
  isPvPMode = false;
  myPlayerNumber = null;
  isMatchFound = false;

  matchmakingOverlay.classList.add("hidden");
  pvpModeButton.classList.remove("active");

  // Reaktiviere Buttons
  playModeButton.disabled = false;
  speedToggleButton.disabled = false;

  // Zeige alle Control-Buttons wieder an
  speedToggleButton.style.display = "flex";
  playModeButton.style.display = "flex";
  pvpModeButton.style.display = "flex";

  // Setze Labels zurück
  const player1Label = document.querySelector(".player1 .player-label");
  const player2Label = document.querySelector(".player2 .player-label");
  player1Label.textContent = isManualMode ? "SPIELER" : "CPU 1";
  player2Label.textContent = "CPU 2";

  // Setze Kamera auf Standard zurück
  setCameraForPlayer(1);

  resetGame();
}

function sendPaddleUpdate(position) {
  if (ws && ws.readyState === WebSocket.OPEN && isPvPMode) {
    ws.send(
      JSON.stringify({
        type: "paddle_update",
        position: { x: position },
      }),
    );
  }
}

function sendBallUpdate() {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    isPvPMode &&
    myPlayerNumber === 1
  ) {
    ws.send(
      JSON.stringify({
        type: "ball_update",
        position: {
          x: ball.position.x,
          y: ball.position.y,
          z: ball.position.z,
        },
        velocity: gameState.ball.velocity,
      }),
    );
  }
}

function sendScoreUpdate() {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    isPvPMode &&
    myPlayerNumber === 1
  ) {
    ws.send(
      JSON.stringify({
        type: "score_update",
        score1: gameState.score1,
        score2: gameState.score2,
      }),
    );
  }
}

// Spiel starten
document.addEventListener("DOMContentLoaded", () => {
  console.log("3D Tischtennis-Spiel gestartet!");
  initScene();
  createNeonGrid();
  resetBall();
  updateScore();
  gameLoop();
});
