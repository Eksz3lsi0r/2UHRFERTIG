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
const bg1 = createSound("/sounds/wgame1.wav", { loop: false, volume: 0.5 });
const bg2 = createSound("/sounds/wgame2.wav", { loop: false, volume: 0.5 });
const bgTracks = [bg1, bg2];
let currentIdx = 0;

function playNext() {
  if (!howlAvailable) return;

  try {
    bgTracks[currentIdx].off("end"); // alten Listener lösen
    currentIdx = (currentIdx + 1) % bgTracks.length;
    bgTracks[currentIdx].once("end", playNext);
    bgTracks[currentIdx].play();
  } catch (err) {
    console.error("Fehler beim Abspielen der Hintergrundmusik:", err);
  }
}

/*  öffentliche Funktionen  */
export function startBg() {
  if (!howlAvailable) return;

  try {
    stopBg();
    currentIdx = 0;
    bgTracks[0].once("end", playNext);
    bgTracks[0].play();
  } catch (err) {
    console.error("Fehler beim Starten der Hintergrundmusik:", err);
  }
}

export function stopBg() {
  if (!howlAvailable) return;

  try {
    bgTracks.forEach((t) => {
      t.off("end");
      t.stop();
    });
  } catch (err) {
    console.error("Fehler beim Stoppen der Hintergrundmusik:", err);
  }
}

// Die globale Variable 'Howl' wird durch das Script in index.html bereitgestellt.
