"use client";

/**
 * Retour sensoriel des pensées rapides.
 *
 * - Android / navigateurs compatibles : `navigator.vibrate`, débloqué par la
 *   première interaction (Chrome exige une activation utilisateur).
 * - iOS : la Vibration API n'existe pas. On propose un petit carillon Web Audio,
 *   désactivable, qui accompagne toujours le halo visuel.
 */

const SOUND_KEY = "a-deux:tap-sound";
export const TAP_SOUND_EVENT = "a-deux:tap-sound-change";

type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function audioConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const legacy = window as unknown as {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? legacy.webkitAudioContext ?? null;
}

function ensureAudio(): AudioContext | null {
  if (audioContext) return audioContext;
  const Constructor = audioConstructor();
  if (!Constructor) return null;
  try {
    audioContext = new Constructor();
  } catch {
    audioContext = null;
  }
  return audioContext;
}

export function isTapSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setTapSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Stockage indisponible : le réglage reste valable pour la session.
  }
  if (enabled) void ensureAudio()?.resume();
  window.dispatchEvent(new Event(TAP_SOUND_EVENT));
}

export function vibrateTap(pattern: number | number[] = [18, 50, 18]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Refus silencieux : le visuel et le son prennent le relais.
  }
}

/** À brancher au premier geste : réveille la vibration et l'AudioContext iOS. */
export function installFeedbackUnlock(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let done = false;
  const unlock = () => {
    if (done) return;
    done = true;
    vibrateTap(0);
    void ensureAudio()?.resume();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
  };

  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("touchstart", unlock, true);

  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    window.removeEventListener("touchstart", unlock, true);
  };
}

/** Petit carillon à deux notes, court et discret. */
export function playTapChime(): void {
  if (!isTapSoundEnabled()) return;
  const context = ensureAudio();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume();
  }

  try {
    const start = context.currentTime;
    const notes = [
      { frequency: 880, delay: 0 },
      { frequency: 1174.66, delay: 0.12 },
    ];

    for (const note of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + note.delay;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.55);
    }
  } catch {
    // Audio bloqué : le halo visuel reste le signal principal.
  }
}
