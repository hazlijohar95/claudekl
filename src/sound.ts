import type { PlayOptions, SoundDefinition } from "@web-kits/audio";
import { useSyncExternalStore } from "react";

/*
 * The site's sound palette, synthesised with @web-kits/audio: no audio files.
 *
 * Browsers only allow audio after a user gesture, so the library loads on the
 * visitor's first pointer or key press, and nothing plays before that. Sounds
 * triggered earlier (the hero story on first load) are skipped rather than
 * queued, so audio never bursts out late. A header toggle mutes everything and
 * the choice is remembered.
 */

const S = {
  // UI
  tap: { source: { type: "sine", frequency: { start: 1700, end: 620 } }, envelope: { decay: 0.045 }, gain: 0.12 },
  key: {
    source: { type: "square", frequency: 2300 },
    filter: { type: "highpass", frequency: 1800 },
    envelope: { decay: 0.014 },
    gain: 0.035,
  },
  enter: {
    layers: [
      { source: { type: "square", frequency: 660 }, envelope: { decay: 0.05 }, gain: 0.05 },
      { source: { type: "square", frequency: 990 }, envelope: { decay: 0.08 }, gain: 0.05, delay: 0.06 },
    ],
  },
  flip: {
    layers: [
      {
        source: { type: "noise", color: "pink" },
        filter: { type: "bandpass", frequency: 1400, resonance: 0.8, envelope: { peak: 3200, decay: 0.12 } },
        envelope: { attack: 0.01, decay: 0.14 },
        gain: 0.16,
      },
      { source: { type: "sine", frequency: { start: 900, end: 520 } }, envelope: { decay: 0.05 }, gain: 0.08, delay: 0.1 },
    ],
  },
  pick: { source: { type: "sine", frequency: { start: 700, end: 1300 } }, envelope: { decay: 0.06 }, gain: 0.1 },
  drop: { source: { type: "sine", frequency: { start: 420, end: 160 } }, envelope: { decay: 0.09 }, gain: 0.16 },
  shuffle: {
    layers: [0, 0.05, 0.1, 0.15].map((delay, i) => ({
      source: { type: "triangle" as const, frequency: 520 + i * 140 },
      envelope: { decay: 0.04 },
      gain: 0.08,
      delay,
    })),
  },
  soundOn: {
    layers: [
      { source: { type: "sine", frequency: 784 }, envelope: { decay: 0.12 }, gain: 0.1 },
      { source: { type: "sine", frequency: 1175 }, envelope: { decay: 0.2 }, gain: 0.08, delay: 0.07 },
    ],
  },

  // Mascots: Clawd is chiptune, Kancil is wooden and soft.
  clawdJump: {
    source: { type: "square", frequency: { start: 280, end: 860 } },
    envelope: { decay: 0.14 },
    gain: 0.07,
    effects: [{ type: "bitcrusher", bits: 6 }],
  },
  clawdTalk: {
    layers: [
      { source: { type: "square", frequency: 880 }, envelope: { decay: 0.04 }, gain: 0.045 },
      { source: { type: "square", frequency: 1320 }, envelope: { decay: 0.05 }, gain: 0.045, delay: 0.06 },
    ],
  },
  kancilHop: {
    source: { type: "triangle", frequency: { start: 240, end: 520 }, fm: { ratio: 2, depth: 40 } },
    envelope: { decay: 0.2 },
    gain: 0.14,
  },

  // The SFO → KUL story
  plane: {
    layers: [
      {
        source: { type: "noise", color: "brown" },
        filter: { type: "lowpass", frequency: 520 },
        envelope: { attack: 1.6, decay: 2.2, sustain: 0.7, release: 2.2 },
        gain: 0.09,
      },
      {
        source: { type: "sawtooth", frequency: 92 },
        filter: { type: "lowpass", frequency: 260 },
        lfo: { type: "sine", frequency: 7, depth: 6, target: "frequency" },
        envelope: { attack: 1.6, decay: 2.2, sustain: 0.6, release: 2.2 },
        gain: 0.035,
      },
    ],
  },
  leap: {
    source: { type: "noise", color: "white" },
    filter: { type: "bandpass", frequency: 600, resonance: 1.2, envelope: { peak: 4200, decay: 0.32 } },
    envelope: { attack: 0.02, decay: 0.34 },
    gain: 0.12,
  },
  chute: {
    layers: [
      {
        source: { type: "noise", color: "pink" },
        filter: { type: "lowpass", frequency: 900 },
        envelope: { decay: 0.16 },
        gain: 0.3,
      },
      { source: { type: "sine", frequency: { start: 150, end: 70 } }, envelope: { decay: 0.16 }, gain: 0.22 },
    ],
  },
  land: {
    layers: [
      { source: { type: "sine", frequency: { start: 160, end: 48 } }, envelope: { decay: 0.14 }, gain: 0.3 },
      { source: { type: "noise", color: "brown" }, filter: { type: "lowpass", frequency: 400 }, envelope: { decay: 0.08 }, gain: 0.2 },
    ],
  },
  capToss: {
    source: { type: "noise", color: "white" },
    filter: { type: "bandpass", frequency: 1800, resonance: 1.4, envelope: { peak: 5200, decay: 0.5 } },
    envelope: { attack: 0.05, decay: 0.55 },
    gain: 0.08,
  },
  capOn: {
    layers: [523.25, 659.25, 783.99, 1046.5].map((frequency, i) => ({
      source: { type: "square" as const, frequency },
      envelope: { decay: i === 3 ? 0.22 : 0.07 },
      gain: 0.05,
      delay: i * 0.07,
    })),
  },

  // Restoran Clawd
  pour: {
    source: { type: "noise", color: "pink" },
    filter: { type: "bandpass", frequency: 900, resonance: 2.2, envelope: { peak: 2600, decay: 0.5 } },
    envelope: { attack: 0.04, decay: 0.55 },
    gain: 0.1,
  },
  clink: {
    layers: [0, 0.09].map((delay) => ({
      source: { type: "sine" as const, frequency: 2640 },
      envelope: { decay: 0.12 },
      gain: 0.06,
      delay,
    })),
  },
} satisfies Record<string, SoundDefinition>;

export type SoundName = keyof typeof S;

/* ---------------------------------------------------------- preference */

const KEY = "sound";
const listeners = new Set<() => void>();
let enabled = true;
try {
  enabled = typeof localStorage === "undefined" || localStorage.getItem(KEY) !== "off";
} catch {
  // storage blocked: default on
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage blocked: the choice lasts for this page view
  }
  for (const fn of listeners) fn();
  if (on) play("soundOn");
}

export function useSoundOn() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => enabled,
    () => true,
  );
}

/* ---------------------------------------------------------- playback */

type Player = (opts?: PlayOptions) => unknown;
let players: Partial<Record<SoundName, Player>> | null = null;
// The gesture that unlocks audio usually wants a sound itself (a tap, a
// jump); hold that one sound until the synth has loaded.
let pending: { name: SoundName; opts?: PlayOptions; at: number } | null = null;

/** Load the synth on the first gesture; the AudioContext may start then. */
function unlock() {
  window.removeEventListener("pointerdown", unlock, true);
  window.removeEventListener("keydown", unlock, true);
  void import("@web-kits/audio").then(({ defineSound, ensureReady }) => {
    const ready: Partial<Record<SoundName, Player>> = {};
    for (const name of Object.keys(S) as SoundName[]) ready[name] = defineSound(S[name]);
    players = ready;
    if (pending && performance.now() - pending.at < 500) play(pending.name, pending.opts);
    pending = null;
    return ensureReady();
  });
}
function isSoundName(v: string): v is SoundName {
  return Object.hasOwn(S, v);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  // Plain links and buttons opt in with data-sound="tap" instead of handlers.
  document.addEventListener("click", (e) => {
    const name = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-sound]")?.dataset.sound : undefined;
    if (name && isSoundName(name)) play(name, { jitter: { detune: 60 } });
  });
}

export function play(name: SoundName, opts?: PlayOptions) {
  if (!enabled) return;
  if (!players) {
    pending = { name, opts, at: performance.now() };
    return;
  }
  try {
    players[name]?.(opts);
  } catch {
    // audio is decoration; never let it break an interaction
  }
}
