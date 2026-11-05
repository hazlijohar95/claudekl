import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { CLAY, INK, IVORY } from "../brand";
import { frameLoop, introSeen, markIntroSeen, prefersReducedMotion, useBlink, useSpeech } from "../motion";
import { hallLines, klClawdLines, mamakLines, sfClawdLines } from "../site";
import { play, type SoundName } from "../sound";
import { Announce, Bubble } from "./Bubble";
import {
  CLAWD_BLINK,
  CLAWD_BODY_CENTRE,
  CLAWD_CENTER_X,
  CLAWD_FEET_Y,
  ClawdArt,
  eyesAt,
  lookToward,
  playClawdPoke,
} from "./Clawd";
import { BannerArt, CapArt, ChuteArt, MugArt, PlaneBodyArt, SuitcaseArt } from "./landingArt";
import { SCENE } from "./Skyline";
import { BOARD, HALL, MAMAK } from "./streetArt";

/*
 * "SFO → KUL": a plane appears far off on the left, small and low, threading
 * behind the city. It comes forward in the gap past Merdeka 118, a Clawd in
 * shades pops up through its roof, and over the Petronas Towers that Clawd
 * flips off, skydives, pops a chute and lands in front of them. The KL Clawd welcomes it with a cap carrying the Jalur
 * Gemilang's crescent and star.
 *
 * The whole scene is `pose(t)`, a pure function of story time. The loop only
 * advances t (while the hero is on screen) and writes what changed. That keeps
 * the choreography in one readable place, makes replay exact, and lets reduced
 * motion jump straight to the final pose.
 *
 * Coordinates are the skyline's own (SCENE, from Skyline.tsx), so the landing
 * spot and the meeting under the skybridge hold at every screen size.
 *
 * After the story, the skyline's two ends are tappable: the mamak on the left
 * (teh tarik) and the conference hall on the right (Build Day). Each sends
 * both Clawds out and back, as a shorter sequence on the same clock.
 */

const GROUND = SCENE.ground;
const S = 0.6; // Clawd art units → skyline units

const T = {
  klWalk: [0.4, 3.0],
  far: [2.0, 7.2], // distant and small, behind the buildings
  near: 7.2, // in front of the city from here, growing as it closes in
  pop: 7.5, // SF Clawd pops up through the roof hatch
  cruise: 9.0, // over the skybridge, slowing for the drop
  crouch: 9.0, // SF Clawd, riding on top, gets ready
  leap: 9.35, // jumps off with a forward flip
  open: 10.5, // clear below the plane, pulls the chute: the canopy snaps open
  exit: [10.6, 12.6], // the plane climbs away to the right
  land: 13.4, // flares and touches down
  klApproach: [14.5, 15.7],
  capPop: 17.2,
  toss: [17.9, 18.7],
  hop: [19.0, 19.56],
  end: 23.3,
} as const;

// They meet either side of the skybridge.
const KL_X = [SCENE.bridgeX - 210, SCENE.bridgeX - 140, SCENE.bridgeX - 75] as const;
const SF_X = SCENE.bridgeX + 75;

const SCRIPT: ReadonlyArray<{ who: Who; from: number; to: number; text: string }> = [
  { who: "sf", from: 13.8, to: 15.5, text: "Landed. SFO → KUL" },
  { who: "kl", from: 15.8, to: 17.1, text: "Selamat datang!" },
  { who: "sf", from: 19.0, to: 20.9, text: "Terima kasih, KL!" },
  { who: "kl", from: 21.1, to: 23.0, text: "Jom, teh tarik!" },
];

type Who = "kl" | "sf";

/* ------------------------------------------------------------- trips
   Walk over, do the thing, walk home. Times are seconds since the trip
   began. KL is the local; SF answers in English, with the odd word it has
   picked up. Both ends sit back from the towers, so the Clawds shrink a
   little (`depth`) as they walk over, like heading down the road. */

type Line = { who: Who; from: number; to: number; text: string };
type Place = "mamak" | "hall";
type Trip = {
  seats: Readonly<Record<Who, number>>;
  depth: number;
  go: readonly [number, number];
  back: readonly [number, number];
  end: number;
  /** At the stop: face each other (a table), or face the building (a door). */
  face: "each-other" | "front";
  /** Tea in hand, served and finished. */
  mug?: readonly [number, number];
  sips?: readonly number[];
  /** Through the doors and out of sight. */
  indoors?: readonly [number, number];
  script: readonly Line[];
  cues: ReadonlyArray<{ at: number; sound: SoundName }>;
};

const TRIPS: Record<Place, Trip> = {
  mamak: {
    seats: MAMAK.seats,
    depth: 0.72,
    go: [0.4, 4.6],
    back: [12.0, 16.2],
    end: 16.4,
    face: "each-other",
    mug: [6.0, 11.8],
    sips: [6.9, 8.4],
    script: [
      { who: "kl", from: 0, to: 1.6, text: "Jom, mamak!" },
      { who: "sf", from: 1.0, to: 2.6, text: "Makan time!" },
      { who: "kl", from: 4.8, to: 6.2, text: "Teh tarik dua!" },
      { who: "sf", from: 6.6, to: 8.2, text: "So good." },
      { who: "kl", from: 8.6, to: 10.0, text: "Best, kan?" },
      { who: "sf", from: 10.2, to: 11.6, text: "Same time tomorrow?" },
    ],
    cues: [{ at: 6.0, sound: "clink" }],
  },
  // Build Day: in through the hall doors, heard from inside, back out.
  hall: {
    seats: HALL.seats,
    depth: 0.6,
    go: [0.4, 4.6],
    back: [11.0, 15.2],
    end: 15.4,
    face: "front",
    indoors: [5.0, 10.4],
    script: [
      { who: "kl", from: 0, to: 1.6, text: "Build Day, jom!" },
      { who: "sf", from: 1.0, to: 2.6, text: "Let's go!" },
      { who: "kl", from: 6.0, to: 7.6, text: "Demo time!" },
      { who: "sf", from: 7.8, to: 9.4, text: "Ship it!" },
      { who: "kl", from: 11.0, to: 12.6, text: "Best event, kan?" },
      { who: "sf", from: 12.8, to: 14.4, text: "See you next month!" },
    ],
    cues: [
      { at: 5.0, sound: "soundOn" },
      { at: 10.4, sound: "soundOn" },
    ],
  },
};

type Outing = { place: Place; at: number };
const onOuting = (t: number, o: Outing | null) => o !== null && t >= o.at && t < o.at + TRIPS[o.place].end;

declare global {
  interface Window {
    /** Dev only: scrub the story, e.g. `__landing.seek(12.8, true)`. */
    __landing?: { seek: (t: number, hold?: boolean) => void };
  }
}
/** rot pivots on the feet, spin on the body centre (for the flip); k is depth scale. */
type Actor = { x: number; y: number; k: number; sx: number; sy: number; rot: number; spin: number; look: number; step: number };

/* ------------------------------------------------------------ easing */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bump = (p: number) => Math.sin(Math.PI * p);
const easeIn = (p: number) => p * p;
const easeOut = (p: number) => 1 - (1 - p) ** 2;
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const easeOutBack = (p: number) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
const inside = (t: number, [a, b]: readonly [number, number]) => t >= a && t < b;

/** Anticipation squash, airtime, landing squash. p runs 0..1 over the hop. */
function hop(p: number, height: number) {
  if (p <= 0 || p >= 1) return { dy: 0, sx: 1, sy: 1 };
  if (p < 0.15) {
    const q = bump(p / 0.15);
    return { dy: 0, sx: 1 + 0.12 * q, sy: 1 - 0.14 * q };
  }
  if (p < 0.85) {
    const q = bump((p - 0.15) / 0.7);
    return { dy: -height * q, sx: 1 - 0.04 * q, sy: 1 + 0.05 * q };
  }
  const q = bump((p - 0.85) / 0.15);
  return { dy: 0, sx: 1 + 0.1 * q, sy: 1 - 0.12 * q };
}

function withHop(a: Actor, h: { dy: number; sx: number; sy: number }): Actor {
  return { ...a, y: a.y + h.dy, sx: a.sx * h.sx, sy: a.sy * h.sy };
}

/* --------------------------------------------------------------- plane
   Far: from the left edge of the city, low among the low-rise roofs, it
   threads behind the blocks, the street and Merdeka 118 (drawn in the layer
   behind the skyline), growing and speeding up as it closes in, and climbs
   in the last stretch. Near: it changes layers at SWITCH, the open gap past
   Merdeka 118 where it overlaps nothing, then comes forward to full size
   over the skybridge, cruises slowly for the drop, and climbs away. */

const PLANE_SCALE = 1.7;
// Where the far leg starts: the city's left edge, or just off the left of the
// screen when the screen shows less (phones), so the leg is never off-screen.
const FAR_ENTER = -260;
const FAR_K0 = 0.2; // depth at the start of the far leg
// How far the nose reaches ahead of the plane's anchor at that depth (plane
// art: anchor x 68, nose at 140 plus its outline and shadow), so a leg that
// starts at the screen edge starts wholly off it.
const NOSE_AHEAD = (140 + 9 - 68) * PLANE_SCALE * FAR_K0;
const SWITCH = { x: 455, y: 190, k: 0.45 };
const DROP = { x: 580, y: 108 };
const CRUISE_SPEED = 22; // units/s over the drop zone

type PlanePose = { x: number; y: number; k: number; tilt: number; far: boolean; banner: number };

function planeAt(t: number, enterX = FAR_ENTER): PlanePose | null {
  if (t < T.far[0] || t >= T.exit[1]) return null;
  const bob = (k: number) => 3 * k * Math.sin(t * 2.6);
  if (t < T.near) {
    const u = seg(t, ...T.far);
    const climb = easeInOut(seg(u, 0.55, 1));
    const k = lerp(FAR_K0, SWITCH.k, u ** 1.6);
    return {
      x: lerp(enterX, SWITCH.x, u ** 1.35),
      y: lerp(262, SWITCH.y, climb) + bob(k),
      k,
      tilt: -6 * climb,
      far: true,
      banner: 0,
    };
  }
  if (t < T.cruise) {
    const p = easeOut(seg(t, T.near, T.cruise));
    const k = lerp(SWITCH.k, 1, p);
    return {
      x: lerp(SWITCH.x, DROP.x, p),
      y: lerp(SWITCH.y, DROP.y, p) + bob(k),
      k,
      tilt: -6 * (1 - p),
      far: false,
      banner: easeOut(seg(t, T.near, T.near + 0.8)), // the banner unrolls behind it
    };
  }
  // Cruise, then away to the right. It lifts a little once its passenger is
  // away, and waggles its wings goodbye.
  const exitStart = DROP.x + CRUISE_SPEED * (T.exit[0] - T.cruise);
  const e = easeIn(seg(t, ...T.exit));
  return {
    x: t < T.exit[0] ? DROP.x + CRUISE_SPEED * (t - T.cruise) : lerp(exitStart, 1520, e),
    y: DROP.y + bob(1) - 12 * easeOut(seg(t, T.leap, T.leap + 1.2)) - 40 * e,
    k: 1,
    tilt: -7 * Math.sin((t - T.leap) * 9) * bump(seg(t, T.leap + 0.3, T.leap + 1.5)) - 5 * e,
    far: false,
    banner: 1,
  };
}

// SF Clawd stands on the fuselage roof (plane art y 20, centred at y 30),
// scaled with the plane's depth.
const RIDE_OFF: PlanePose = { x: -999, y: 0, k: 1, tilt: 0, far: false, banner: 0 };
const ride = (t: number) => {
  const pl = planeAt(t) ?? RIDE_OFF;
  return { x: pl.x - 4 * pl.k, y: pl.y + (20 - 30) * PLANE_SCALE * pl.k - GROUND, k: pl.k };
};

/* ------------------------------------------------------- the skydive
   Leap: ballistic, y(τ) = y0 − 160τ + 260τ², drifting forward at 25/s so
   the plane pulls ahead, with a forward flip. By `open` Clawd has fallen
   clear below the plane; the canopy snaps out and the descent becomes a
   gentle ease to the ground, 1 − (1−p)^1.25, so it flares before touchdown. */

const LEAP = { vx: 25, vy: 160, g: 260 };
const LEAP_FROM = ride(T.leap);
const leapAt = (tau: number) => ({
  x: LEAP_FROM.x + LEAP.vx * tau,
  y: LEAP_FROM.y - LEAP.vy * tau + LEAP.g * tau * tau,
});
const OPEN = leapAt(T.open - T.leap);

// Depth: up by the plane SF Clawd is far away and small; it grows to full
// size as it falls toward the street.
const FAR = 0.6;

function sfPose(t: number): Actor {
  const base = { k: FAR, sx: 1, sy: 1, rot: 0, spin: 0, step: 0 };
  if (t < T.leap) {
    // Riding: pops up out of the roof hatch, then crouches into the jump.
    const r = ride(t);
    const c = easeIn(seg(t, T.crouch, T.leap));
    const up = easeOutBack(seg(t, T.pop, T.pop + 0.35));
    return { ...base, x: r.x, y: r.y, k: FAR * r.k, sx: 1 + 0.16 * c, sy: (1 - 0.22 * c) * up, look: 1 };
  }
  if (t < T.open) {
    const tau = t - T.leap;
    const flip = easeOut(seg(tau, 0, 0.75));
    const launch = bump(seg(tau, 0, 0.3));
    return { ...base, ...leapAt(tau), spin: 360 * flip, sx: 1 - 0.06 * launch, sy: 1 + 0.1 * launch, look: 1 };
  }
  const p = seg(t, T.open, T.land);
  const since = t - T.open;
  const jolt = bump(seg(since, 0, 0.3)); // harness tug when the canopy bites
  const calm = (1 - p) ** 1.5;
  return {
    ...base,
    k: lerp(FAR, 1, easeInOut(p)),
    x: lerp(OPEN.x, SF_X, easeInOut(p)) + 10 * Math.sin(2.2 * since) * calm,
    y: lerp(OPEN.y, 0, 1 - (1 - p) ** 1.25),
    sx: 1 - 0.08 * jolt,
    sy: 1 + 0.12 * jolt,
    rot: 9 * Math.sin(2.2 * since + 0.5) * calm,
    look: t > T.land + 0.4 ? -1 : 0,
  };
}

/* -------------------------------------------------------------- pose */

/**
 * Overlay a trip on an actor's settled pose (`a` is where it stands at
 * home). `still` (reduced motion) keeps everyone where they stand: the tea
 * still comes, the hall still lights up, and the chat still happens.
 */
function onTrip(a: Actor, who: Who, v: number, trip: Trip, still: boolean): Actor {
  if (v < 0 || v >= trip.end) return a;
  const going = v < trip.back[0];
  const p = going ? easeInOut(seg(v, ...trip.go)) : 1 - easeInOut(seg(v, ...trip.back));
  const walking = !still && (inside(v, trip.go) || inside(v, trip.back));
  const there = Math.sign(trip.seats[who] - a.x) || 1;
  const stopped = v >= trip.go[1] && going;
  const look = !stopped ? (going ? there : -there) : trip.face === "front" ? 0 : who === "kl" ? 1 : -1;
  let out: Actor = {
    ...a,
    x: still ? a.x : lerp(a.x, trip.seats[who], p),
    k: still ? a.k : lerp(a.k, trip.depth, p),
    look,
    step: walking ? Math.floor(v / 0.14) % 2 : 0,
  };
  if (!still) for (const s of trip.sips ?? []) out = withHop(out, hop(seg(v, s, s + 0.5), 7));
  return out;
}

function pose(t: number, jumps: Record<Who, number>, outing: Outing | null, still: boolean, enterX = FAR_ENTER) {
  const trip = outing ? TRIPS[outing.place] : null;
  const v = outing ? t - outing.at : -1;
  // KL Clawd: strolls, waits, watches the plane and the drop, walks over.
  const klWalking = inside(t, T.klWalk) || inside(t, T.klApproach);
  const plane = planeAt(t, enterX);
  const klX =
    t < T.klApproach[0]
      ? lerp(KL_X[0], KL_X[1], seg(t, ...T.klWalk))
      : lerp(KL_X[1], KL_X[2], easeInOut(seg(t, ...T.klApproach)));
  // KL watches the plane come in until the jump, then the drop, to its right.
  const watch = plane && t < T.leap ? Math.sign(plane.x - klX) || 1 : 1;
  let kl: Actor = {
    x: klX,
    y: 0,
    k: 1,
    sx: 1,
    sy: 1,
    rot: 0,
    spin: 0,
    look: klWalking ? 1 : t >= T.far[0] + 1 ? watch : 0,
    step: klWalking ? Math.floor(t / 0.14) % 2 : 0,
  };
  if (trip) kl = onTrip(kl, "kl", v, trip, still);
  kl = withHop(kl, hop(seg(t, T.toss[0] - 0.15, T.toss[0] + 0.35), 18)); // the toss
  kl = withHop(kl, hop(seg(t, jumps.kl, jumps.kl + 0.56), 60));

  let sf = sfPose(t);
  if (trip) sf = onTrip(sf, "sf", v, trip, still);
  const capLand = T.toss[1];
  sf = withHop(sf, hop(0.85 + 0.15 * seg(t, T.land, T.land + 0.3), 0)); // touchdown squash
  sf = withHop(sf, hop(0.85 + 0.15 * seg(t, capLand, capLand + 0.24), 0)); // cap lands
  sf = withHop(sf, hop(seg(t, ...T.hop), 46)); // happy hop
  sf = withHop(sf, hop(seg(t, jumps.sf, jumps.sf + 0.56), 60));

  // Cap: pops up over KL, arcs across with a spin, then rides on SF's head.
  let cap: { x: number; y: number; scale: number; spin: number } | "worn" | null = null;
  if (t >= capLand) cap = "worn";
  else if (t >= T.capPop) {
    const held = { x: kl.x, y: GROUND + kl.y - 30 };
    const p = easeInOut(seg(t, ...T.toss));
    cap = {
      x: lerp(held.x, sf.x, p),
      y: lerp(held.y, GROUND + sf.y, p) - 120 * bump(p),
      scale: easeOutBack(seg(t, T.capPop, T.capPop + 0.3)),
      spin: 360 * p,
    };
  }

  const say: Record<Who, string | null> = { kl: null, sf: null };
  for (const line of SCRIPT) if (t >= line.from && t < line.to) say[line.who] = line.text;
  for (const line of trip?.script ?? []) if (v >= line.from && v < line.to) say[line.who] = line.text;

  // Indoors: the Clawds fade through the doors, and the hall lights up while
  // they're in (even under reduced motion, where they stay put).
  const indoors = trip?.indoors;
  const lit = indoors ? clamp01(seg(v, indoors[0] - 0.4, indoors[0]) - seg(v, indoors[1], indoors[1] + 0.6)) : 0;
  const shown = indoors && !still ? 1 - clamp01(seg(v, indoors[0] - 0.4, indoors[0]) - seg(v, indoors[1], indoors[1] + 0.4)) : 1;
  const mug = trip?.mug;

  return {
    kl,
    sf,
    sfShown: t >= T.pop,
    chute: {
      shown: t >= T.open && t < T.land + 0.6,
      open: easeOutBack(seg(t, T.open, T.open + 0.35)),
      collapse: seg(t, T.land, T.land + 0.6),
    },
    suitcaseLanded: t >= T.land,
    cap,
    plane,
    say,
    // Tea in hand: 0 hidden, popping in to 1.
    mug: mug && inside(v, mug) ? (still ? 1 : easeOutBack(seg(v, mug[0], mug[0] + 0.3))) : 0,
    shown,
    lit,
    storyLook: t < T.end || onOuting(t, outing),
  };
}

/* -------------------------------------------------------------- sound
   Each cue fires when story time crosses it going forward, so pausing,
   seeking back or replaying never fires a pile of sounds at once. */

const CUES: ReadonlyArray<{ at: number; sound: SoundName }> = [
  { at: T.near - 1.6, sound: "plane" }, // swells as it comes forward
  { at: T.leap, sound: "leap" },
  { at: T.open, sound: "chute" },
  { at: T.land, sound: "land" },
  { at: T.toss[0], sound: "capToss" },
  { at: T.toss[1], sound: "capOn" },
  { at: T.hop[0] + 0.08, sound: "clawdJump" },
  ...SCRIPT.map((line) => ({ at: line.from, sound: "clawdTalk" as const })),
];
// Relative to the trip's start.
const tripCues = (trip: Trip) => [...trip.cues, ...trip.script.map((line) => ({ at: line.from, sound: "clawdTalk" as const }))];

/* --------------------------------------------------------- transforms */

const n = (v: number) => Math.round(v * 100) / 100;
const place = (a: Actor) =>
  `translate(${n(a.x)} ${n(GROUND + a.y)}) scale(${n(S * a.k)}) rotate(${n(a.rot)}) translate(0 ${-CLAWD_BODY_CENTRE}) rotate(${n(a.spin)}) translate(0 ${CLAWD_BODY_CENTRE}) scale(${n(a.sx)} ${n(a.sy)}) translate(${-CLAWD_CENTER_X} ${-CLAWD_FEET_Y})`;
// Cap art shares Clawd's coordinates; spin and pop happen about its centre (90, -20).
const flyingCap = (c: { x: number; y: number; scale: number; spin: number }) =>
  `translate(${n(c.x)} ${n(c.y)}) scale(${S}) translate(${-CLAWD_CENTER_X} ${-CLAWD_FEET_Y}) translate(90 -20) rotate(${n(c.spin)}) scale(${n(c.scale)}) translate(-90 20)`;

// The mug pops about its own centre, on Clawd's right arm.
const mugPop = (k: number) => `translate(160 26) scale(${n(k)}) translate(-160 -26)`;

const NO_JUMPS: Record<Who, number> = { kl: -9, sf: -9 };
const KL_START = place(pose(0, NO_JUMPS, null, false).kl);
// Once landed, the suitcase stands on the ground beside SF and rolls along
// wherever SF goes: SF's x and depth, but none of its hops.
const besideSf = (sf: Actor): Actor => ({ x: sf.x, y: 0, k: sf.k, sx: 1, sy: 1, rot: 0, spin: 0, look: 0, step: 0 });

/* ---------------------------------------------------------- component */

export function ClawdLanding({ replay = 0 }: { replay?: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  // Refs only: stable for the component's lifetime, so effects can close over them.
  const el = {
    kl: useRef<SVGGElement>(null),
    sf: useRef<SVGGElement>(null),
    klEyes: useRef<SVGGElement>(null),
    sfEyes: useRef<SVGGElement>(null),
    klLids: useRef<SVGGElement>(null),
    sfLids: useRef<SVGGElement>(null),
    klMug: useRef<SVGGElement>(null),
    sfMug: useRef<SVGGElement>(null),
    chute: useRef<SVGGElement>(null),
    suitcase: useRef<SVGGElement>(null),
    cap: useRef<SVGGElement>(null),
    plane: useRef<SVGGElement>(null),
    farPlane: useRef<SVGGElement>(null),
    banner: useRef<SVGGElement>(null),
    hallLights: useRef<SVGGElement>(null),
    hallBoard: useRef<SVGGElement>(null),
    klSay: useRef<HTMLDivElement>(null),
    sfSay: useRef<HTMLDivElement>(null),
  };
  useBlink(el.klLids, CLAWD_BLINK, 160);
  useBlink(el.sfLids, CLAWD_BLINK, 160);

  const clock = useRef(0);
  const jumps = useRef<Record<Who, number>>({ ...NO_JUMPS });
  const outing = useRef<Outing | null>(null);
  const wake = useRef(() => {});
  // Scripted lines come from the story; taps say the next line for a moment.
  const [klScript, setKlScript] = useState<string | null>(null);
  const [sfScript, setSfScript] = useState<string | null>(null);
  const [klTap, klTapNext] = useSpeech(klClawdLines, 2400);
  const [sfTap, sfTapNext] = useSpeech(sfClawdLines, 2400);
  const [mamakTap, mamakTapNext] = useSpeech(mamakLines, 2200);
  const [hallTap, hallTapNext] = useSpeech(hallLines, 2200);
  const [hover, setHover] = useState<Place | null>(null);

  const held = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__landing = {
      seek: (t, hold = false) => {
        clock.current = t;
        held.current = hold;
        wake.current();
      },
    };
    return () => {
      delete window.__landing;
    };
  }, []);

  useEffect(() => {
    // Replays (replay > 0) always play; the first mount skips to the end if
    // this session has already seen it.
    clock.current = prefersReducedMotion() || (replay === 0 && introSeen()) ? T.end : 0;
    jumps.current = { ...NO_JUMPS };
    outing.current = null;
    wake.current();
  }, [replay]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = prefersReducedMotion();

    // Write-only-on-change, keyed by node and attribute.
    const written = new Map<Element, Map<string, string>>();
    const changed = (node: Element, key: string, value: string) => {
      let seen = written.get(node);
      if (!seen) written.set(node, (seen = new Map()));
      if (seen.get(key) === value) return false;
      seen.set(key, value);
      return true;
    };
    const write = (node: Element | null, attr: string, value: string) => {
      if (node && changed(node, attr, value)) node.setAttribute(attr, value);
    };
    const anchor = (node: HTMLDivElement | null, a: Actor, top: number) => {
      if (!node) return;
      const left = `${n((a.x / SCENE.w) * 100)}%`;
      const bottom = `${n(((SCENE.h - (SCENE.ground + a.y - top * S * a.k)) / SCENE.h) * 100)}%`;
      if (changed(node, "left", left)) node.style.left = left;
      if (changed(node, "bottom", bottom)) node.style.bottom = bottom;
    };

    let prevT = clock.current;
    const loop = frameLoop(stage, ({ dt, box, pointer }) => {
      // Reduced motion holds the story at its end, but a trip still runs its
      // clock so the tea, the lights and the chat play out.
      const o = outing.current;
      if (!held.current && (!reduced || onOuting(clock.current, o))) clock.current += dt;
      const t = clock.current;
      if (t > prevT && t - prevT < 0.1) {
        for (const cue of CUES) if (prevT < cue.at && t >= cue.at) play(cue.sound);
        if (o)
          for (const cue of tripCues(TRIPS[o.place])) {
            const at = o.at + cue.at;
            if (prevT < at && t >= at) play(cue.sound);
          }
      }
      if (prevT < T.end && t >= T.end) markIntroSeen();
      prevT = t;
      // The scene x at the screen's left edge, from the stage's own box.
      const screenX0 = (-box.left / box.width) * SCENE.w;
      const p = pose(t, jumps.current, o, reduced, Math.max(FAR_ENTER, screenX0 - NOSE_AHEAD));

      // Eyes: scripted during the story, then they watch the pointer.
      const lookAt = (a: Actor) =>
        p.storyLook || !pointer ? a.look : lookToward(pointer.x - (box.left + (a.x / SCENE.w) * box.width), box.width * 0.02);

      write(el.kl.current, "transform", place(p.kl));
      write(el.kl.current, "opacity", String(n(p.shown)));
      write(el.kl.current, "data-step", String(p.kl.step));
      write(el.klEyes.current, "transform", eyesAt(lookAt(p.kl)));

      write(el.sf.current, "display", p.sfShown ? "inline" : "none");
      write(el.sf.current, "transform", place(p.sf));
      write(el.sf.current, "opacity", String(n(p.shown)));
      write(el.sfEyes.current, "transform", eyesAt(lookAt(p.sf)));

      const c = p.chute;
      write(el.chute.current, "display", c.shown ? "inline" : "none");
      write(
        el.chute.current,
        "transform",
        `translate(${n(20 * c.collapse)} 0) translate(90 -73) scale(${n(0.3 + 0.7 * c.open)} ${n(1 - c.collapse)}) translate(-90 73)`,
      );
      write(el.chute.current, "opacity", String(n(1 - c.collapse)));

      for (const mug of [el.klMug.current, el.sfMug.current]) {
        write(mug, "display", p.mug > 0 ? "inline" : "none");
        write(mug, "transform", mugPop(p.mug));
      }

      write(el.suitcase.current, "display", p.sfShown ? "inline" : "none");
      write(el.suitcase.current, "transform", `${place(p.suitcaseLanded ? besideSf(p.sf) : p.sf)} translate(${p.suitcaseLanded ? "176 70" : "166 46"})`);
      write(el.suitcase.current, "opacity", String(n(p.shown)));

      write(el.cap.current, "display", p.cap ? "inline" : "none");
      if (p.cap) write(el.cap.current, "transform", p.cap === "worn" ? place(p.sf) : flyingCap(p.cap));
      write(el.cap.current, "opacity", String(n(p.shown)));

      write(el.hallLights.current, "display", p.lit > 0 ? "inline" : "none");
      write(el.hallLights.current, "opacity", String(n(p.lit)));
      write(el.hallBoard.current, "display", p.lit > 0.5 ? "inline" : "none");

      // The plane lives in one of two layers: behind the skyline while far,
      // in front of it once near.
      const pl = p.plane;
      const flying = pl ? `translate(${n(pl.x)} ${n(pl.y)}) rotate(${n(pl.tilt)}) scale(${n(PLANE_SCALE * pl.k)}) translate(-68 -30)` : "";
      write(el.farPlane.current, "display", pl?.far ? "inline" : "none");
      write(el.plane.current, "display", pl && !pl.far ? "inline" : "none");
      if (pl) write(pl.far ? el.farPlane.current : el.plane.current, "transform", flying);
      write(el.banner.current, "transform", `translate(4 30) scale(${n(pl?.banner ?? 0)} 1) translate(-4 -30)`);

      setKlScript(p.say.kl);
      setSfScript(p.say.sf);
      anchor(el.klSay.current, p.kl, CLAWD_FEET_Y);
      anchor(el.sfSay.current, p.sf, CLAWD_FEET_Y + (p.cap === "worn" ? 50 : 0));

      // Sleep once the story is over and nobody is mid-jump; pointer moves
      // (for the eyes), taps and replays wake the loop.
      return t < T.end || t < Math.max(jumps.current.kl, jumps.current.sf) + 0.6 || onOuting(t, o);
    });
    wake.current = loop.wake;
    return loop.stop;
  }, []);

  const poke = (who: Who) => {
    if (who === "kl") klTapNext();
    else sfTapNext();
    if (!prefersReducedMotion()) jumps.current[who] = clock.current;
    playClawdPoke();
    wake.current();
  };
  // Tapping a place always answers; the Clawds go once the story is over
  // and they're not already out somewhere.
  const goTo = (where: Place) => () => {
    if (where === "mamak") {
      mamakTapNext();
      play("pour");
    } else {
      hallTapNext();
      play("tap");
    }
    const now = clock.current;
    if (onOuting(now, outing.current) || (outing.current && now < outing.current.at)) return;
    outing.current = { place: where, at: Math.max(now, T.end) };
    wake.current();
  };
  const places: ReadonlyArray<{
    where: Place;
    box: { x0: number; x1: number; top: number; centre: number };
    label: string;
    hint: string;
    line: string | null;
  }> = [
    { where: "mamak", box: MAMAK, label: "Mamak, open 24 hours. Send the Clawds for a tea break.", hint: "Tea break? ☕", line: mamakTap },
    { where: "hall", box: HALL, label: "Conference hall, Build Day. Send the Clawds to the community event.", hint: "Build Day's on. Go in?", line: hallTap },
  ];
  const activate = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="stage" ref={stageRef}>
      {/* Behind the skyline (app.css .stage-back): the plane while it's far off. */}
      <svg className="stage-back" viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} shapeRendering="crispEdges" aria-hidden="true">
        <g ref={el.farPlane} display="none">
          <PlaneBodyArt />
        </g>
      </svg>
      <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} shapeRendering="crispEdges">
        <g ref={el.plane} display="none" aria-hidden="true">
          <g ref={el.banner}>
            <BannerArt />
          </g>
          <PlaneBodyArt />
        </g>
        <g ref={el.suitcase} display="none" aria-hidden="true">
          <SuitcaseArt />
        </g>
        {/* Build Day under way: the hall's glass and doors glow, and the
            billboard takes over from its taglines. */}
        <g ref={el.hallLights} display="none" aria-hidden="true">
          <rect x={HALL.glass.x} y={HALL.glass.y} width={HALL.glass.w} height={HALL.glass.h} fill={IVORY} opacity="0.55" />
          <rect x={HALL.door.x} y={HALL.door.y} width={HALL.door.w} height={GROUND - HALL.door.y} fill={IVORY} />
        </g>
        <g ref={el.hallBoard} display="none" aria-hidden="true">
          <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} fill={INK} />
          <text
            x={BOARD.x + BOARD.w / 2}
            y={BOARD.y + 25.5}
            textAnchor="middle"
            fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
            fontWeight="800"
            fontSize="14"
            fill={CLAY}
          >
            NOW: BUILD DAY
          </text>
        </g>
        {places.map(({ where, box, label }) => (
          <rect
            key={where}
            className="actor place-hit"
            x={box.x0}
            y={box.top}
            width={box.x1 - box.x0}
            height={GROUND - box.top}
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={goTo(where)}
            onKeyDown={activate(goTo(where))}
            onPointerEnter={() => setHover(where)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(where)}
            onBlur={() => setHover(null)}
          />
        ))}
        <g
          ref={el.kl}
          className="actor"
          transform={KL_START}
          role="button"
          tabIndex={0}
          aria-label="KL Clawd, in taped-up glasses. Click to make it jump."
          onClick={() => poke("kl")}
          onKeyDown={activate(() => poke("kl"))}
        >
          <ClawdArt eyesRef={el.klEyes} lidsRef={el.klLids} nerd />
          <g ref={el.klMug} display="none">
            <MugArt />
          </g>
        </g>
        <g
          ref={el.sf}
          className="actor"
          display="none"
          role="button"
          tabIndex={0}
          aria-label="Clawd from San Francisco, wearing a Malaysia cap. Click to make it jump."
          onClick={() => poke("sf")}
          onKeyDown={activate(() => poke("sf"))}
        >
          <g ref={el.chute} display="none">
            <ChuteArt />
          </g>
          <ClawdArt eyesRef={el.sfEyes} lidsRef={el.sfLids} shades />
          {/* Held in the left hand, mirrored about Clawd's centre line. */}
          <g transform={`translate(${CLAWD_CENTER_X * 2} 0) scale(-1 1)`}>
            <g ref={el.sfMug} display="none">
              <MugArt />
            </g>
          </g>
        </g>
        <g ref={el.cap} display="none" aria-hidden="true">
          <CapArt />
        </g>
      </svg>
      <div className="stage-say" ref={el.klSay}>
        <Bubble line={klTap ?? klScript} />
        <Announce text={klTap} />
      </div>
      <div className="stage-say" ref={el.sfSay}>
        <Bubble line={sfTap ?? sfScript} />
        <Announce text={sfTap} />
      </div>
      {places.map(({ where, box, hint, line }) => (
        <div
          key={where}
          className="stage-say"
          style={{
            left: `${n((box.centre / SCENE.w) * 100)}%`,
            bottom: `${n(((SCENE.h - box.top + 6) / SCENE.h) * 100)}%`,
          }}
        >
          <Bubble line={line ?? (hover === where ? hint : null)} />
          <Announce text={line} />
        </div>
      ))}
    </div>
  );
}
