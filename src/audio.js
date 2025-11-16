/* --------------------------------------------------------------------
 *  src/audio.js   –   Soundeffekte & Hintergrundmusik
 * ------------------------------------------------------------------ */

// Debug mode toggle - set to false for production, true for development
const DEBUG_MODE = false;

// Utility function for conditional logging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Prüfen, ob Howl verfügbar ist
const howlAvailable = typeof Howl !== "undefined";

// Hilfsfunktion für sichere Sound-Erstellung
function createSound(path, options = {}) {
  if (!howlAvailable) {
    return {
      play: () => debugLog(`Sound würde abgespielt: ${path}`),
      stop: () => { },
      once: () => { },
      off: () => { },
    };
  }
  return new Howl({
    src: [path],
    html5: true,
    ...options,
  });
}

/* ---------- Soundeffekte --------------------------------------------- */
export const placeSound = createSound("/sounds/place.wav");
export const clearSound = createSound("/sounds/clear.wav", {
  volume: 0.3
});
export const successSound = createSound("/sounds/success.wav");
export const pickSound = createSound("/sounds/pick.wav");

/* ---------- Power-Up Soundeffekte ------------------------------------ */
export const stormSound = createSound("/sounds/wind.wav", {
  rate: 0.8,
  volume: 0.7,
  loop: false
});
export const electroSound = createSound("/sounds/Electro.wav", {
  rate: 1.0,
  volume: 0.8,
  loop: false
});
export const extendSound = createSound("/sounds/extend.flac", {
  rate: 1.0,
  volume: 0.6,
  loop: false
});

/* ---------- Power-Up Sound Control Functions ------------------------- */
export function stopPowerUpSounds() {
  if (howlAvailable) {
    try {
      stormSound.stop();
      electroSound.stop();
      extendSound.stop();
      debugLog("🔇 All power-up sounds stopped");
    } catch (err) {
      debugLog("Power-up sound stop failed:", err);
    }
  }
}

export function stopStormSound() {
  if (howlAvailable) {
    try {
      stormSound.stop();
      debugLog("🔇 Storm sound stopped");
    } catch (err) {
      debugLog("Storm sound stop failed:", err);
    }
  }
}

export function stopElectroSound() {
  if (howlAvailable) {
    try {
      electroSound.stop();
      debugLog("🔇 Electro sound stopped");
    } catch (err) {
      debugLog("Electro sound stop failed:", err);
    }
  }
}

export function stopExtendSound() {
  if (howlAvailable) {
    try {
      extendSound.stop();
      debugLog("🔇 Extend sound stopped");
    } catch (err) {
      debugLog("Extend sound stop failed:", err);
    }
  }
}

/* ---------- Hintergrundmusik (zwei Tracks im Wechsel) ---------------- */
// Check if background music files exist before creating sounds
let bg1, bg2, bgTracks = [];

function initBackgroundMusic() {
  try {
    // Only create background sounds if Howl is available
    if (howlAvailable) {
      // Create sounds with error handling
      bg1 = new Howl({
        src: ["/sounds/wgame1.wav"],
        loop: false,
        volume: 0.5,
        onloaderror: (id, error) => {
          debugLog("Background music file 1 not found, skipping background music");
        }
      });

      bg2 = new Howl({
        src: ["/sounds/wgame2.wav"],
        loop: false,
        volume: 0.5,
        onloaderror: (id, error) => {
          debugLog("Background music file 2 not found, skipping background music");
        }
      });

      bgTracks = [bg1, bg2];
    }
  } catch (err) {
    debugLog("Background music initialization failed, continuing without music");
    bgTracks = [];
  }
}

// Initialize background music
initBackgroundMusic();

let currentIdx = 0;

function playNext() {
  if (!howlAvailable || bgTracks.length === 0) return;

  try {
    bgTracks[currentIdx].off("end"); // alten Listener lösen
    currentIdx = (currentIdx + 1) % bgTracks.length;
    bgTracks[currentIdx].once("end", playNext);
    bgTracks[currentIdx].play();
  } catch (err) {
    debugLog("Background music playback failed, continuing without music");
  }
}

/*  öffentliche Funktionen  */
export function startBg() {
  if (!howlAvailable || bgTracks.length === 0) {
    debugLog("Background music not available, continuing without music");
    return;
  }

  try {
    stopBg();
    currentIdx = 0;
    bgTracks[0].once("end", playNext);
    bgTracks[0].play();
  } catch (err) {
    debugLog("Background music start failed, continuing without music");
  }
}

export function stopBg() {
  if (!howlAvailable || bgTracks.length === 0) return;

  try {
    bgTracks.forEach((t) => {
      t.off("end");
      t.stop();
    });
  } catch (err) {
    debugLog("Background music stop failed");
  }
}

// Die globale Variable 'Howl' wird durch das Script in index.html bereitgestellt.
