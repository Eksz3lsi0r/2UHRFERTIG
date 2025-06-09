/* --------------------------------------------------------------------
 *  src/audio.js   –   Soundeffekte & Hintergrundmusik
 * ------------------------------------------------------------------ */

// Prüfen, ob Howl verfügbar ist
const howlAvailable = typeof Howl !== "undefined";

// Hilfsfunktion für sichere Sound-Erstellung
function createSound(path, options = {}) {
  if (!howlAvailable) {
    return {
      play: () => console.log(`Sound würde abgespielt: ${path}`),
      stop: () => {},
      once: () => {},
      off: () => {},
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
export const clearSound = createSound("/sounds/clear.wav");
export const successSound = createSound("/sounds/success.wav");
export const pickSound = createSound("/sounds/pick.wav");

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
          console.log("Background music file 1 not found, skipping background music");
        }
      });

      bg2 = new Howl({
        src: ["/sounds/wgame2.wav"],
        loop: false,
        volume: 0.5,
        onloaderror: (id, error) => {
          console.log("Background music file 2 not found, skipping background music");
        }
      });

      bgTracks = [bg1, bg2];
    }
  } catch (err) {
    console.log("Background music initialization failed, continuing without music");
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
    console.log("Background music playback failed, continuing without music");
  }
}

/*  öffentliche Funktionen  */
export function startBg() {
  if (!howlAvailable || bgTracks.length === 0) {
    console.log("Background music not available, continuing without music");
    return;
  }

  try {
    stopBg();
    currentIdx = 0;
    bgTracks[0].once("end", playNext);
    bgTracks[0].play();
  } catch (err) {
    console.log("Background music start failed, continuing without music");
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
    console.log("Background music stop failed");
  }
}

// Die globale Variable 'Howl' wird durch das Script in index.html bereitgestellt.
