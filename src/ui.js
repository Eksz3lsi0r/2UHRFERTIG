/* --------------------------------------------------------------------
 *  src/ui.js   –   Menü- & UI-Handling
 * ------------------------------------------------------------------ */
import { LANG } from "./constants.js";
import { state } from "./state.js";

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    debugLog(...args);
  }
}

/* --------------------------------------------------------------------
 *  Chat Message Function (available globally early)
 * ------------------------------------------------------------------ */
// --- Chat notification state ---
let unreadChatMessages = 0;
let chatNotificationBadge = null;
let lastChatMessageTime = 0;

// --- Make appendChatMessage globally available early ---
window.appendChatMessage = function (msg, fromSelf = false) {
  const chatMessages = document.getElementById("chat-messages");
  debugLog("[Chat] appendChatMessage called", {
    msg,
    fromSelf,
    chatMessagesExists: !!chatMessages,
  });

  if (!chatMessages) {
    console.warn("[Chat] chat-messages div not found!"); // Keep warning
    return;
  }

  try {
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.margin = "2px 0";
    div.style.wordBreak = "break-word";
    div.style.textAlign = fromSelf ? "right" : "left";
    div.style.color = fromSelf ? "#a96cff" : "#fff";

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Handle notifications for incoming messages
    if (!fromSelf) {
      handleIncomingChatMessage(msg);
    }

    debugLog("[Chat] Message successfully appended to chat");
  } catch (error) {
    console.error("[Chat] Error appending message:", error); // Keep error
  }
};

// --- Handle incoming chat message notifications ---
function handleIncomingChatMessage(msg) {
  const chatModal = document.getElementById("chat-modal");
  const isChatOpen = chatModal && chatModal.style.display === "flex";

  // Only increment unread count if chat is not open
  if (!isChatOpen) {
    unreadChatMessages++;
    updateChatNotificationBadge();
  }

  // Show brief notification in game area
  showBriefChatNotification(msg);
}

// --- Update chat notification badge ---
function updateChatNotificationBadge() {
  const chatBubble = document.getElementById("chat-bubble");
  if (!chatBubble) return;

  if (!chatNotificationBadge) {
    // Create notification badge
    chatNotificationBadge = document.createElement("div");
    chatNotificationBadge.id = "chat-notification-badge";
    chatNotificationBadge.style.cssText = `
      position: absolute;
      top: -6px;
      right: -6px;
      background: #ff4757;
      color: white;
      border-radius: 50%;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 51;
      box-shadow: 0 2px 6px rgba(255, 71, 87, 0.4);
      animation: badge-pulse 2s infinite ease-in-out;
    `;

    // Add CSS animation
    if (!document.getElementById("chat-notification-styles")) {
      const style = document.createElement("style");
      style.id = "chat-notification-styles";
      style.textContent = `
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes brief-chat-fade {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Don't override position - keep original CSS positioning
    chatBubble.appendChild(chatNotificationBadge);
  }

  if (unreadChatMessages > 0) {
    chatNotificationBadge.textContent = unreadChatMessages > 99 ? "99+" : unreadChatMessages.toString();
    chatNotificationBadge.style.display = "flex";

    // Add glow effect to chat bubble
    chatBubble.style.boxShadow = "0 2px 8px #8a2be244, 0 0 15px rgba(255, 71, 87, 0.6)";
  } else {
    chatNotificationBadge.style.display = "none";
    chatBubble.style.boxShadow = "0 2px 8px #8a2be244";
  }
}

// --- Show brief chat notification in game area ---
function showBriefChatNotification(msg) {
  const currentTime = Date.now();

  // Throttle notifications to avoid spam
  if (currentTime - lastChatMessageTime < 1000) return;
  lastChatMessageTime = currentTime;

  // Extract sender name and message content
  let senderName = "Gegner";
  let messageContent = msg;

  if (msg.includes(": ")) {
    const parts = msg.split(": ", 2);
    senderName = parts[0];
    messageContent = parts[1];
  }

  // Create brief notification element
  const briefNotification = document.createElement("div");
  briefNotification.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 12, 41, 0.95);
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.9em;
    z-index: 200;
    max-width: 300px;
    text-align: center;
    border: 1px solid #8a2be2;
    box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
    animation: brief-chat-fade 4s ease-in-out forwards;
    pointer-events: none;
  `;

  // Truncate long messages
  if (messageContent.length > 50) {
    messageContent = messageContent.substring(0, 47) + "...";
  }

  briefNotification.innerHTML = `
    <div style="color: #8a2be2; font-weight: bold; font-size: 0.8em; margin-bottom: 2px;">
      💬 ${senderName}
    </div>
    <div>${messageContent}</div>
  `;

  document.body.appendChild(briefNotification);

  // Remove after animation
  setTimeout(() => {
    if (briefNotification.parentNode) {
      briefNotification.parentNode.removeChild(briefNotification);
    }
  }, 4000);
}

// --- Clear unread messages when chat is opened ---
function clearChatNotifications() {
  unreadChatMessages = 0;
  updateChatNotificationBadge();
}

/* --------------------------------------------------------------------
 *  Modul-Variablen
 * ------------------------------------------------------------------ */
let currentLanguage = "de";
let graphicsQuality = "medium";

/* --------------------------------------------------------------------
 *  Settings  (localStorage)
 * ------------------------------------------------------------------ */
function loadSettings() {
  const savedLang = localStorage.getItem("gameLanguage");
  const savedGraphics = localStorage.getItem("gameGraphics");
  debugLog("Loading settings from localStorage:", {
    savedLang,
    savedGraphics,
  });

  if (savedLang && LANG[savedLang]) currentLanguage = savedLang;
  if (savedGraphics) graphicsQuality = savedGraphics;

  debugLog("Settings loaded:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });
  applyGraphicsQuality();
}

function saveSettings() {
  debugLog("Saving settings:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });
  localStorage.setItem("gameLanguage", currentLanguage);
  localStorage.setItem("gameGraphics", graphicsQuality);
  debugLog("Settings saved to localStorage");
}

/* --------------------------------------------------------------------
 *  Grafikqualität
 * ------------------------------------------------------------------ */
function applyGraphicsQuality() {
  debugLog("Applying graphics quality:", graphicsQuality);
  document.body.classList.remove(
    "graphics-low",
    "graphics-medium",
    "graphics-high"
  );
  document.body.classList.add(`graphics-${graphicsQuality}`);
  debugLog("Body class list:", document.body.className);
}

/* --------------------------------------------------------------------
 *  Übersetzung
 * ------------------------------------------------------------------ */
function translateUI() {
  // Synchronize state.currentLanguage with local currentLanguage
  state.currentLanguage = currentLanguage;

  document.querySelectorAll("[data-lang-key]").forEach((el) => {
    const key = el.getAttribute("data-lang-key");
    if (LANG[currentLanguage] && LANG[currentLanguage][key]) {
      el.textContent = LANG[currentLanguage][key];
    }
  });
  // refresh headings with current player and opponent names
  updateBoardTitles();
}

function getLangText(key) {
  return (LANG[currentLanguage] && LANG[currentLanguage][key]) || key;
}

/* --------------------------------------------------------------------
 *  Menü-Anzeigen
 * ------------------------------------------------------------------ */
function showMainMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  // ensure start menu is hidden
  const startMenu = document.getElementById("startMenuContainer");
  const registerMenu = document.getElementById("registerMenuContainer");
  if (startMenu) startMenu.style.display = "none";
  if (registerMenu) registerMenu.style.display = "none";
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  // Update UI based on authentication status
  updateMainMenuForUser();

  mainMenu.style.display = "flex";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  import("./audio.js").then((mod) => mod.stopBg());

  // Spieler-Board und Inventar komplett leeren
  if (state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.boardCells[r][c].className = "cell";
        state.boardCells[r][c].innerHTML = "";
      }
    }
  }
  if (state.el.score) state.el.score.textContent = "0";
  if (state.el.pieces) state.el.pieces.innerHTML = "";
  // Auch Opponent-Board leeren (optional, für Klarheit)
  if (state.opponentBoardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.opponentBoardCells[r][c].className = "opponent-cell";
      }
    }
  }
  if (state.el.oppScore) state.el.oppScore.textContent = "0";

  // Spieler-Board und Inventar auch im State leeren
  state.playerBoard = Array(10)
    .fill(0)
    .map(() => Array(10).fill(0));
  state.playerPieces = [];

  // DOM-Grid mit leerem State synchronisieren
  if (state.boardCells?.length) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        state.boardCells[r][c].className = "cell";
        state.boardCells[r][c].innerHTML = "";
        state.boardCells[r][c].style.background = "";
        state.boardCells[r][c].classList.remove(
          "filled",
          "rainbow",
          "preview-valid-cell",
          "preview-invalid-cell",
          "row-flash"
        );
      }
    }
  }

  // Update player ranking points display
  updatePlayerRankingPoints();
}

function showSettingsMenu() {
  debugLog("Showing settings menu with current values:", {
    language: currentLanguage,
    graphics: graphicsQuality,
  });

  const { mainMenu, settings, gameArea, leaderboard } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "flex";
  settings.style.flexDirection = "column";
  settings.style.alignItems = "center";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }

  // Update select elements to show current values
  if (state.el.languageSelect) {
    state.el.languageSelect.value = currentLanguage;
    debugLog("Set language select to:", currentLanguage);
  }
  if (state.el.graphicsQualitySelect) {
    state.el.graphicsQualitySelect.value = graphicsQuality;
    debugLog("Set graphics quality select to:", graphicsQuality);
  }

  // Translate UI to reflect current language
  translateUI();

  // Apply current graphics quality
  applyGraphicsQuality();
}

function showGameArea() {
  const { mainMenu, settings, gameArea, message, leaderboard, pvpMode } =
    state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "flex";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  // Do NOT hide message overlay here, so timer/info is visible
  // update the board headings
  updateBoardTitles();

  // Initialize permanent multiplier displays for real-time visibility
  initializePermanentMultiplierDisplays();

  import("./audio.js").then((mod) => mod.startBg());
}

function showCpuDifficultyMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (pvpMode) pvpMode.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "flex";
  }

  // Translate UI to reflect current language
  translateUI();
}

function showPvpModeMenu() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (leaderboard) leaderboard.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  if (pvpMode) {
    pvpMode.style.display = "flex";
    pvpMode.style.flexDirection = "column";
    pvpMode.style.alignItems = "center";
  }

  // Update PvP menu based on user status
  updatePvpMenuForUser();

  // Translate UI to reflect current language
  translateUI();
}

function showLeaderboard() {
  const { mainMenu, settings, gameArea, leaderboard, pvpMode } = state.el;
  const cpuDifficultyContainer = document.getElementById(
    "cpuDifficultyContainer"
  );

  mainMenu.style.display = "none";
  settings.style.display = "none";
  gameArea.style.display = "none";
  if (cpuDifficultyContainer) {
    cpuDifficultyContainer.style.display = "none";
  }
  if (leaderboard) {
    leaderboard.style.display = "flex";
    leaderboard.style.flexDirection = "column";
    leaderboard.style.alignItems = "center";
  }
  if (pvpMode) pvpMode.style.display = "none";

  // Load leaderboard data
  loadLeaderboardData();
}

async function loadLeaderboardData() {
  const loadingElement = document.getElementById("leaderboardLoading");
  const emptyElement = document.getElementById("leaderboardEmpty");
  const listElement = document.getElementById("leaderboardList");

  // Show loading state
  if (loadingElement) loadingElement.style.display = "block";
  if (emptyElement) emptyElement.style.display = "none";
  if (listElement) listElement.style.display = "none";

  try {
    const response = await fetch("/api/leaderboard");
    const leaderboardData = await response.json();

    // Hide loading state
    if (loadingElement) loadingElement.style.display = "none";

    if (
      leaderboardData.success &&
      leaderboardData.players &&
      leaderboardData.players.length > 0
    ) {
      // Show leaderboard list
      if (listElement) {
        listElement.style.display = "block";
        renderLeaderboard(leaderboardData.players);
      }
      if (emptyElement) emptyElement.style.display = "none";
    } else {
      // Show empty state
      if (emptyElement) emptyElement.style.display = "block";
      if (listElement) listElement.style.display = "none";
    }
  } catch (error) {
    console.error("Failed to load leaderboard:", error);
    // Hide loading state and show empty state on error
    if (loadingElement) loadingElement.style.display = "none";
    if (emptyElement) emptyElement.style.display = "block";
    if (listElement) listElement.style.display = "none";
  }
}

function renderLeaderboard(players) {
  const listElement = document.getElementById("leaderboardList");
  if (!listElement) return;

  // Sort players by ranking points (highest first)
  const sortedPlayers = players.sort(
    (a, b) => b.rankingPoints - a.rankingPoints
  );

  // Generate HTML for leaderboard items
  const leaderboardHTML = sortedPlayers
    .map((player, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : "";

      return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">#${rank}</div>
        <div class="leaderboard-player-info">
          <div class="leaderboard-player-name">${escapeHtml(player.name)}</div>
          <div class="leaderboard-player-stats">
            <span data-lang-key="wins">${getLangText("wins")}</span>: ${
        player.wins || 0
      } •
            <span data-lang-key="losses">${getLangText("losses")}</span>: ${
        player.losses || 0
      }
          </div>
        </div>
        <div class="leaderboard-points">
          ${player.rankingPoints}
          <div class="leaderboard-points-label" data-lang-key="rankingPoints">${getLangText(
            "rankingPoints"
          )}</div>
        </div>
      </div>
    `;
    })
    .join("");

  listElement.innerHTML = leaderboardHTML;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* --------------------------------------------------------------------
 *  Spielfeld-DOM anlegen
 * ------------------------------------------------------------------ */
function buildBoardDOM() {
  const { board, oppBoard } = state.el;

  // Überprüfen, ob die DOM-Elemente existieren
  if (!board || !oppBoard) {
    console.error("Board-Elemente nicht gefunden. UI wird neu initialisiert.");
    setTimeout(initUI, 100);
    return;
  }

  board.innerHTML = "";
  oppBoard.innerHTML = "";
  state.boardCells = [];
  state.opponentBoardCells = [];

  // Setze Grid-Properties für moderne Layout-Gestaltung
  board.style.display = "grid";
  board.style.gridTemplateColumns = "repeat(10, 1fr)";
  board.style.gridTemplateRows = "repeat(10, 1fr)";
  board.style.gap = "3px";

  oppBoard.style.display = "grid";
  oppBoard.style.gridTemplateColumns = "repeat(10, 1fr)";
  oppBoard.style.gridTemplateRows = "repeat(10, 1fr)";
  oppBoard.style.gap = "3px";

  for (let r = 0; r < 10; r++) {
    const row = [];
    const oppRow = [];
    for (let c = 0; c < 10; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      board.appendChild(cell);
      row.push(cell);

      const oppCell = document.createElement("div");
      oppCell.className = "opponent-cell";
      oppCell.dataset.row = r;
      oppCell.dataset.col = c;
      oppBoard.appendChild(oppCell);
      oppRow.push(oppCell);
    }
    state.boardCells.push(row);
    state.opponentBoardCells.push(oppRow);
  }

  // Initialize permanent multiplier displays for real-time visibility
  initializePermanentMultiplierDisplays();
}

/* --------------------------------------------------------------------
 *  Initialisierung
 * ------------------------------------------------------------------ */
function initUI() {
  const $ = (id) => document.getElementById(id);

  /* DOM-Referenzen cachen */
  state.el = {
    /* Menüs & Container */
    mainMenu: $("mainMenuContainer"),
    settings: $("settingsMenuContainer"),
    leaderboard: $("leaderboardContainer"),
    pvpMode: $("pvpModeContainer"),
    gameArea: $("gameArea"),

    /* Eingaben & Buttons */
    playerNameInput: $("playerNameInput"),
    playVsCpuButton: $("playVsCpuButton"),
    playVsPlayerButton: $("playVsPlayerButton"),
    normalPvPButton: $("normalPvPButton"),
    rankedPvPButton: $("rankedPvPButton"),
    backFromPvPModeButton: $("backFromPvPModeButton"),
    leaderboardButton: $("leaderboardButton"),
    settingsButton: $("settingsButton"),
    saveSettingsButton: $("saveSettingsButton"),
    backToMainMenuButton: $("backToMainMenuButton"),
    languageSelect: $("languageSelect"),
    graphicsQualitySelect: $("graphicsQualitySelect"),

    /* Spiel-Bereiche */
    message: $("message"),
    board: $("board"),
    pieces: $("pieces"),
    oppBoard: $("opponentBoard"),
    score: $("score"),
    oppScore: $("opponentScore"),
  };

  /* Button-Events */
  if (state.el.saveSettingsButton) {
    state.el.saveSettingsButton.addEventListener("click", () => {
      debugLog("Save settings button clicked");
      saveSettings();
      showMainMenu();
    });
  } else {
    console.error("saveSettingsButton not found");
  }

  if (state.el.backToMainMenuButton) {
    state.el.backToMainMenuButton.addEventListener("click", showMainMenu);
  } else {
    console.error("backToMainMenuButton not found");
  }

  if (state.el.languageSelect) {
    state.el.languageSelect.addEventListener("change", (e) => {
      debugLog("Language changed to:", e.target.value);
      currentLanguage = e.target.value;
      translateUI();
      updateBoardTitles();
    });
  } else {
    console.error("languageSelect not found");
  }

  if (state.el.graphicsQualitySelect) {
    state.el.graphicsQualitySelect.addEventListener("change", (e) => {
      debugLog("Graphics quality changed to:", e.target.value);
      graphicsQuality = e.target.value;
      applyGraphicsQuality();
    });
  } else {
    console.error("graphicsQualitySelect not found");
  }

  // CPU Difficulty Selection Button Event Handlers
  const easyModeButton = document.getElementById("easyModeButton");
  const mediumModeButton = document.getElementById("mediumModeButton");
  const hardModeButton = document.getElementById("hardModeButton");
  const backFromDifficultyButton = document.getElementById(
    "backFromDifficultyButton"
  );

  if (easyModeButton) {
    easyModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("easy");
      }
    });
  }

  if (mediumModeButton) {
    mediumModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("medium");
      }
    });
  }

  if (hardModeButton) {
    hardModeButton.addEventListener("click", () => {
      if (typeof window.startCpuGameWithDifficulty === "function") {
        window.startCpuGameWithDifficulty("hard");
      }
    });
  }

  if (backFromDifficultyButton) {
    backFromDifficultyButton.addEventListener("click", showMainMenu);
  }

  // Leaderboard button event handler
  if (state.el.leaderboardButton) {
    state.el.leaderboardButton.addEventListener("click", showLeaderboard);
  }

  // Back from leaderboard button event handler
  const backFromLeaderboardButton = document.getElementById(
    "backFromLeaderboardButton"
  );
  if (backFromLeaderboardButton) {
    backFromLeaderboardButton.addEventListener("click", showMainMenu);
  }

  /* Initiale Abläufe */
  loadSettings(); // Werte aus localStorage
  translateUI(); // Texte einsetzen
  buildBoardDOM(); // Raster erzeugen einmalig

  // GridSnap nach jedem Board-Build initialisieren (wichtig für Touch-Drag)
  import("./drag.js").then(({ GridSnap }) => {
    if (state.el.board && state.boardCells?.length) {
      GridSnap.init(state.el.board, state.boardCells);
    }
  });
}

/* --------------------------------------------------------------------
 *  Nachrichtenanzeige
 * ------------------------------------------------------------------ */
function displayMessage(text, type = "info") {
  if (!state.el.message) return;

  // Use innerHTML to allow HTML (e.g. <span id="timer">)
  state.el.message.innerHTML = text;

  // Remove all possible classes
  state.el.message.classList.remove("win", "lose", "info");

  // Add type class
  if (type) {
    state.el.message.classList.add(type);
  }

  // Ensure visibility
  state.el.message.style.display = "block";

  // Animation
  state.el.message.classList.remove("message-animated");
  void state.el.message.offsetWidth;
  state.el.message.classList.add("message-animated");
}

// add function to refresh board titles with player/opponent names
function updateBoardTitles() {
  // display only player and opponent names in headings
  const playerLabel = state.playerName;
  const oppLabel = state.opponentName;
  const yourEl = document.querySelector(
    '#playerArea [data-lang-key="yourBoard"]'
  );
  const oppEl = document.querySelector(
    '#opponentArea [data-lang-key="opponentBoard"]'
  );
  if (yourEl) yourEl.textContent = playerLabel;
  if (oppEl) oppEl.textContent = oppLabel;
}

/* --------------------------------------------------------------------
 *  Timer-Anzeige für Aufholjagd
 * ------------------------------------------------------------------ */
function showCatchupTimer({ playerName, score, isFirstFinisher, secondsLeft }) {
  const catchupTimer = document.getElementById("catchup-timer");
  if (!catchupTimer) return;

  // Prüfe, ob auf Mobile (max-width: 600px)
  if (window.matchMedia && window.matchMedia("(max-width: 600px)").matches) {
    catchupTimer.classList.add("mobile-countdown");
  } else {
    catchupTimer.classList.remove("mobile-countdown");
  }

  let infoText;
  if (isFirstFinisher) {
    infoText = `${playerName} hat das Spiel mit ${score} Punkten beendet.<br>Warte auf den Gegner, der noch <span id='catchup-timer-value'></span> Minuten Zeit hat.`;
  } else {
    infoText = `${playerName} hat das Spiel mit ${score} Punkten beendet.<br>Du hast noch <span id='catchup-timer-value'></span> Minuten, um mehr Punkte zu erreichen!`;
  }

  catchupTimer.innerHTML = infoText;
  catchupTimer.style.display = "block";

  // Set initial time for both players
  if (typeof secondsLeft === "number") {
    const timerVal = document.getElementById("catchup-timer-value");
    if (timerVal) {
      const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
      const s = String(secondsLeft % 60).padStart(2, "0");
      timerVal.textContent = `${m}:${s}`;
    }
  }
}

function updateCatchupTimer(secondsLeft) {
  const timerVal = document.getElementById("catchup-timer-value");
  if (timerVal) {
    const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    timerVal.textContent = `${m}:${s}`;
  }
}

function hideCatchupTimer() {
  const catchupTimer = document.getElementById("catchup-timer");
  if (catchupTimer) catchupTimer.style.display = "none";
}

/* --------------------------------------------------------------------
 *  Game Result Overlay
 * ------------------------------------------------------------------ */
function showGameResultOverlay({ win, msg }) {
  const overlay = document.getElementById("gameResultOverlay");
  const title = document.getElementById("gameResultTitle");
  const msgBox = document.getElementById("gameResultMsg");
  const rematchBtn = document.getElementById("rematchButton");
  const mainMenuBtn = document.getElementById("mainMenuButton");

  if (!overlay || !title || !msgBox || !rematchBtn || !mainMenuBtn) return;

  // Set title and color
  if (win) {
    title.textContent = "Gewonnen";
    title.style.color = "#1fd655";
  } else {
    title.textContent = "Verloren";
    title.style.color = "#e74c3c";
  }
  msgBox.innerHTML = msg || "";
  overlay.style.display = "flex";

  // Rematch click
  rematchBtn.onclick = () => {
    overlay.style.display = "none";
    // Rematch = wie die jeweiligen Hauptmenü-Buttons
    if (
      state.currentMode === "player" &&
      typeof window.startPvpMode === "function"
    ) {
      window.startPvpMode();
    } else if (
      state.currentMode === "cpu" &&
      typeof window.startCpuMode === "function"
    ) {
      window.startCpuMode();
    } else {
      // Fallback: wie bisher
      if (state.currentMode === "player") {
        state.currentMode = "player";
        if (state.countdownInterval) clearInterval(state.countdownInterval);
        state.gameActive = false;
        state.opponentFinished = false;
        state.opponentFinalScore = 0;
        state.timeLeft = 0;
        if (typeof window.player?.resetGame === "function") {
          window.player.resetGame();
        }
        state.opponentBoardCells = [];
        if (state.el.oppBoard) state.el.oppBoard.innerHTML = "";
        if (typeof window.ui?.buildBoardDOM === "function") {
          window.ui.buildBoardDOM();
        } else if (typeof buildBoardDOM === "function") {
          buildBoardDOM();
        }
        if (state.el.oppScore) state.el.oppScore.textContent = "0";
        if (state.el.score) state.el.score.textContent = "0";
      } else if (state.currentMode === "cpu") {
        state.cpuBoard = Array(10)
          .fill(0)
          .map(() => Array(10).fill(0));
        if (state.opponentBoardCells?.length) {
          for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
              state.opponentBoardCells[r][c].className = "opponent-cell";
            }
          }
        }
        if (state.el.oppScore) state.el.oppScore.textContent = "0";
      }
      if (typeof window.requestRematch === "function") {
        window.requestRematch();
      } else if (window.socket && window.socket.emit) {
        window.socket.emit("requestRematch");
      }
    }
  };
  // Main menu click
  mainMenuBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.goToMainMenu === "function") {
      window.goToMainMenu();
    } else if (window.ui && window.ui.showMainMenu) {
      window.ui.showMainMenu();
    }
  };
}

/* --------------------------------------------------------------------
 *  Ranked Game Summary Overlay
 * ------------------------------------------------------------------ */
function showRankedGameSummaryOverlay({
  win,
  yourScore,
  opponentScore,
  opponentName,
  rankingChange,
  timeRemaining,
}) {
  const overlay = document.getElementById("rankedGameSummaryOverlay");
  const title = document.getElementById("rankedGameResultTitle");
  const yourFinalScore = document.getElementById("rankedYourFinalScore");
  const opponentFinalScore = document.getElementById(
    "rankedOpponentFinalScore"
  );
  const previousPoints = document.getElementById("rankedPreviousPoints");
  const pointsChange = document.getElementById("rankedPointsChange");
  const newPoints = document.getElementById("rankedNewPoints");
  const timeRemainingSection = document.getElementById("timeRemainingSection");
  const timeRemainingSpan = document.getElementById("rankedTimeRemaining");
  const rematchBtn = document.getElementById("rankedRematchButton");
  const mainMenuBtn = document.getElementById("rankedMainMenuButton");

  if (
    !overlay ||
    !title ||
    !yourFinalScore ||
    !opponentFinalScore ||
    !rematchBtn ||
    !mainMenuBtn
  )
    return;

  // Set title and scores
  const lang = LANG[state.currentLanguage];
  if (win) {
    title.textContent = lang.rankedGameWin(opponentName);
    title.style.color = "#1fd655";
  } else {
    title.textContent = lang.rankedGameLose(opponentName);
    title.style.color = "#e74c3c";
  }

  // Set final scores
  yourFinalScore.textContent = yourScore || 0;
  opponentFinalScore.textContent = opponentScore || 0;

  // Set ranking points change if available
  if (rankingChange && previousPoints && pointsChange && newPoints) {
    previousPoints.textContent = rankingChange.oldPoints || 0;
    newPoints.textContent = rankingChange.newPoints || 0;

    const change = rankingChange.change || 0;
    if (change > 0) {
      pointsChange.textContent = lang.rankedPointsGained(change);
      pointsChange.style.color = "#1fd655";
    } else {
      pointsChange.textContent = lang.rankedPointsLost(change);
      pointsChange.style.color = "#e74c3c";
    }
  }

  // Set time remaining if applicable
  if (timeRemaining > 0 && timeRemainingSection && timeRemainingSpan) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timeRemainingSpan.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
    timeRemainingSection.style.display = "block";
  } else if (timeRemainingSection) {
    timeRemainingSection.style.display = "none";
  }

  // Show overlay
  overlay.style.display = "flex";

  // Set up button handlers
  rematchBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.requestRematch === "function") {
      window.requestRematch();
    } else if (window.socket && window.socket.emit) {
      window.socket.emit("requestRematch");
    }
  };

  mainMenuBtn.onclick = () => {
    overlay.style.display = "none";
    if (typeof window.goToMainMenu === "function") {
      window.goToMainMenu();
    } else if (window.ui && window.ui.showMainMenu) {
      window.ui.showMainMenu();
    }
  };

  // Update player ranking points display for main menu
  updatePlayerRankingPoints();
}

/* --------------------------------------------------------------------
 *  Matchmaking Overlay Functions
 * ------------------------------------------------------------------ */
function showMatchmakingOverlay(isRanked = false) {
  const overlay = document.getElementById("matchmakingOverlay");
  const modeDisplay = document.getElementById("matchmakingMode");
  const cancelButton = document.getElementById("cancelMatchmaking");

  if (!overlay) return;

  // Set mode text
  if (modeDisplay) {
    const modeKey = isRanked ? "rankedMatchmaking" : "normalMatchmaking";
    modeDisplay.textContent = LANG[state.currentLanguage][modeKey] || (isRanked ? "Ranked Battle" : "Normal Battle");
  }

  // Set up cancel button
  if (cancelButton) {
    cancelButton.onclick = () => {
      hideMatchmakingOverlay();
      // Return to PvP mode selection
      showPvpModeMenu();
    };
  }

  // Start estimated wait time countdown
  startWaitTimeEstimation();

  overlay.style.display = "flex";
  translateUI(); // Update all language-dependent elements
}

function hideMatchmakingOverlay() {
  const overlay = document.getElementById("matchmakingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }

  // Clear wait time estimation
  if (state.waitTimeInterval) {
    clearInterval(state.waitTimeInterval);
    state.waitTimeInterval = null;
  }
}

function updateMatchmakingStatus(playerCount = 1) {
  const playerCountElement = document.getElementById("playerCount");
  if (playerCountElement) {
    playerCountElement.textContent = `${playerCount}/2`;
  }
}

function startWaitTimeEstimation() {
  const waitTimeElement = document.getElementById("waitTimeValue");
  if (!waitTimeElement) return;

  let estimatedSeconds = 30; // Start with 30 seconds estimate

  const updateWaitTime = () => {
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;

    if (minutes > 0) {
      waitTimeElement.textContent = `~${minutes}m ${seconds}s`;
    } else {
      waitTimeElement.textContent = `~${seconds}s`;
    }

    // Gradually increase wait time estimate to simulate real matchmaking
    if (estimatedSeconds < 120) {
      estimatedSeconds += 2;
    }
  };

  updateWaitTime(); // Initial update

  // Clear any existing interval
  if (state.waitTimeInterval) {
    clearInterval(state.waitTimeInterval);
  }

  state.waitTimeInterval = setInterval(updateWaitTime, 3000); // Update every 3 seconds
}

// --- Chat UI Logic (PvP only) ---
function setupChatUI() {
  const chatBubble = document.getElementById("chat-bubble");
  const chatModal = document.getElementById("chat-modal");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const chatMessages = document.getElementById("chat-messages");

  if (
    !chatBubble ||
    !chatModal ||
    !chatClose ||
    !chatForm ||
    !chatInput ||
    !chatSend ||
    !chatMessages
  )
    return;

  // Show/hide chat bubble only in PvP mode
  function updateChatVisibility() {
    if (state.currentMode === "player") {
      chatBubble.style.display = "block";
      // Reset chat position when entering player mode
      resetChatPosition();
    } else {
      chatBubble.style.display = "none";
      chatModal.style.display = "none";
      // Reset chat position when leaving player mode
      resetChatPosition();
    }
  }

  // Open chat modal
  function openChat() {
    chatModal.style.display = "flex";
    chatModal.classList.add("open");
    chatInput.focus();
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // Clear notifications when chat is opened
    clearChatNotifications();
  }

  // Close chat modal
  function closeChat() {
    chatModal.style.display = "none";
    chatModal.classList.remove("open");
    chatInput.blur();

    // Reset position to original CSS values to fix positioning issue
    resetChatPosition();
  }

  // Reset chat modal position to original values
  function resetChatPosition() {
    // Remove any inline styles that might override CSS for chat modal
    chatModal.style.top = "";
    chatModal.style.left = "";
    chatModal.style.right = "";
    chatModal.style.bottom = "";
    chatModal.style.transform = "";

    // Also reset chat bubble position to prevent position drift
    chatBubble.style.position = "";
    chatBubble.style.top = "";
    chatBubble.style.left = "";
    chatBubble.style.right = "";
    chatBubble.style.bottom = "";
    chatBubble.style.transform = "";
  }

  // Check if device is mobile
  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 600px)").matches;
  }

  // Close chat when clicking outside (mobile only)
  function handleClickOutside(e) {
    if (isMobile() && chatModal.style.display === "flex") {
      // Check if click is outside of chat modal
      if (!chatModal.contains(e.target) && !chatBubble.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        closeChat();
      }
    }
  }

  // Desktop: open chat on TAB
  document.addEventListener("keydown", (e) => {
    if (
      state.currentMode === "player" &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      if (e.key === "Tab") {
        e.preventDefault();
        if (chatModal.style.display === "flex") {
          closeChat();
        } else {
          openChat();
        }
      }
    }
  });

  // Add click outside listener for mobile
  document.addEventListener("touchstart", handleClickOutside, {
    capture: true,
  });
  document.addEventListener("click", handleClickOutside, { capture: true });

  // Open chat on bubble click/tap
  chatBubble.onclick = openChat;
  // Mobile: also allow touch
  chatBubble.ontouchstart = (e) => {
    e.preventDefault();
    openChat();
  };
  // Close chat
  chatClose.onclick = closeChat;

  // Send message (desktop: Enter, mobile: button)
  chatForm.onsubmit = (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (msg.length > 0) {
      window.sendChatMessage?.(msg);
      chatInput.value = "";
    }
  };

  // Update chat visibility on mode change
  const origShowGameArea = ui.showGameArea;
  ui.showGameArea = function () {
    origShowGameArea.call(ui);
    updateChatVisibility();
  };
  // Also update on main menu/settings
  const origShowMainMenu = ui.showMainMenu;
  ui.showMainMenu = function () {
    origShowMainMenu.call(ui);
    updateChatVisibility();
  };
  const origShowSettingsMenu = ui.showSettingsMenu;
  ui.showSettingsMenu = function () {
    origShowSettingsMenu.call(ui);
    updateChatVisibility();
  };
  // Initial
  updateChatVisibility();
}

/* --------------------------------------------------------------------
 *  Public API
 * ------------------------------------------------------------------ */
export const ui = {
  /* Methoden */
  initUI,
  translateUI,
  showMainMenu,
  showSettingsMenu,
  showPvpModeMenu,
  showGameArea,
  showCpuDifficultyMenu,
  showLeaderboard,
  buildBoardDOM,
  displayMessage,
  getLangText,
  updateBoardTitles,
  updateMainMenuForUser,
  updatePvpMenuForUser,
  showCatchupTimer,
  updateCatchupTimer,
  hideCatchupTimer,
  showGameResultOverlay,
  showRankedGameSummaryOverlay,
  showMatchmakingOverlay,
  hideMatchmakingOverlay,
  updateMatchmakingStatus,
  initializePermanentMultiplierDisplays,

  /* Reactive Getter/Setter */
  get lang() {
    return currentLanguage;
  },
  set lang(l) {
    currentLanguage = l;
    translateUI();
  },
  get graphics() {
    return graphicsQuality;
  },
  set graphics(g) {
    graphicsQuality = g;
    applyGraphicsQuality();
  },
};

/* --------------------------------------------------------------------
 *  Update Player Ranking Points Display
 * ------------------------------------------------------------------ */
function updateMainMenuForUser() {
  // Update leaderboard button behavior for guests
  if (state.el.leaderboardButton) {
    if (state.isGuest) {
      // For guests, show a different message or disable ranked features
      const rankingPoints =
        state.el.leaderboardButton.querySelector(".ranking-points");
      if (rankingPoints) {
        rankingPoints.style.display = "none";
      }
    } else {
      // For authenticated users, show their ranking
      const rankingPoints =
        state.el.leaderboardButton.querySelector(".ranking-points");
      if (rankingPoints) {
        rankingPoints.style.display = "flex";
      }
      updatePlayerRankingPoints();
    }
  }

  // Note: Guests CAN access PvP mode (normal games), so no restrictions here
  // The restriction is only for ranked games, handled in updatePvpMenuForUser
}

function updatePvpMenuForUser() {
  const rankedButton = document.getElementById("rankedPvPButton");
  const normalButton = document.getElementById("normalPvPButton");
  const guestWarning = document.getElementById("guestRankedWarning");

  if (state.isGuest) {
    // For guests: normal PvP is available, ranked is restricted
    if (normalButton) {
      normalButton.disabled = false;
      normalButton.style.opacity = "1";
      normalButton.style.cursor = "pointer";
      normalButton.title =
        "Entspanntes Spiel ohne Auswirkung auf die Rangliste";
    }

    if (rankedButton) {
      rankedButton.disabled = true;
      rankedButton.style.opacity = "0.5";
      rankedButton.style.cursor = "not-allowed";
      rankedButton.title = "Nur für registrierte Champions verfügbar";
      // Add visual strikethrough effect
      rankedButton.style.textDecoration = "line-through";
      rankedButton.style.position = "relative";
    }

    if (guestWarning) {
      guestWarning.style.display = "block";
    }
  } else {
    // For authenticated users: both modes available
    if (normalButton) {
      normalButton.disabled = false;
      normalButton.style.opacity = "1";
      normalButton.style.cursor = "pointer";
      normalButton.title =
        "Entspanntes Spiel ohne Auswirkung auf die Rangliste";
    }

    if (rankedButton) {
      rankedButton.disabled = false;
      rankedButton.style.opacity = "1";
      rankedButton.style.cursor = "pointer";
      rankedButton.style.textDecoration = "none";
      rankedButton.title =
        "Kämpfe um Ranglistenpunkte und steige in der Rangliste auf";
    }

    if (guestWarning) {
      guestWarning.style.display = "none";
    }
  }
}

async function updatePlayerRankingPoints() {
  try {
    // Use playerName from state (set in start menu)
    const playerName = state.playerName || "Player";
    const response = await fetch(
      `/api/player-ranking/${encodeURIComponent(playerName)}`
    );
    const data = await response.json();

    const rankingPointsElement = document.getElementById("playerRankingPoints");
    if (rankingPointsElement) {
      rankingPointsElement.textContent = data.rankingPoints || 1000;
    }
  } catch (error) {
    debugLog("Could not fetch player ranking:", error);
    // Default to 1000 if fetch fails
    const rankingPointsElement = document.getElementById("playerRankingPoints");
    if (rankingPointsElement) {
      rankingPointsElement.textContent = "1000";
    }
  }
}

/* --------------------------------------------------------------------
 *  Initialize Permanent Multiplier Displays
 * ------------------------------------------------------------------ */

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE_UI = false;

// Utility function for conditional logging
function debugLogUI(...args) {
  if (DEBUG_MODE_UI) {
    debugLog(...args);
  }
}

function initializePermanentMultiplierDisplays() {
  debugLogUI("Initializing permanent multiplier displays for real-time visibility");

  // Initialize player permanent multiplier display
  const playerMultiplierElement = document.getElementById("playerPermanentMultiplier");
  const playerMultiplierValueElement = playerMultiplierElement?.querySelector(".multiplier-value");

  if (playerMultiplierElement && playerMultiplierValueElement) {
    playerMultiplierElement.style.display = "flex";
    playerMultiplierValueElement.textContent = "1x";
    debugLogUI("Player permanent multiplier display initialized and visible");
  } else {
    console.warn("Could not find player permanent multiplier elements");
  }

  // Initialize opponent permanent multiplier display
  const opponentMultiplierElement = document.getElementById("opponentPermanentMultiplier");
  const opponentMultiplierValueElement = opponentMultiplierElement?.querySelector(".multiplier-value");

  if (opponentMultiplierElement && opponentMultiplierValueElement) {
    opponentMultiplierElement.style.display = "flex";
    opponentMultiplierValueElement.textContent = "1x";
    debugLogUI("Opponent permanent multiplier display initialized and visible");
  } else {
    console.warn("Could not find opponent permanent multiplier elements");
  }
}

// Call setupChatUI after ui is defined
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupChatUI);
} else {
  setupChatUI();
}
