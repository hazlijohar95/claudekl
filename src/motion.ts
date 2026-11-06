import { type RefObject, useEffect, useRef, useState } from "react";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The hero intro (typed title, the plane story) plays once per browser tab
// session; later visits open on the finished scene.
const INTRO_KEY = "hero-intro-seen";
export function introSeen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}
export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // storage blocked: the intro just plays again next time
  }
}

export const EASE_HOP = "cubic-bezier(.3,.7,.4,1)";
/** Same curve as --ease-out in app.css. */
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

export type Point = { x: number; y: number };
const pointerListeners = new Set<(p: Point) => void>();
const dispatchPointer = (e: PointerEvent) => {
  const p = { x: e.clientX, y: e.clientY };
  for (const fn of pointerListeners) fn(p);
};

/** Subscribe to pointer moves. Every subscriber shares one window listener. */
export function onPointer(fn: (p: Point) => void): () => void {
  if (pointerListeners.size === 0) window.addEventListener("pointermove", dispatchPointer, { passive: true });
  pointerListeners.add(fn);
  return () => {
    pointerListeners.delete(fn);
    if (pointerListeners.size === 0) window.removeEventListener("pointermove", dispatchPointer);
  };
}

// A drag's release velocity is measured over its last stretch.
const VELOCITY_WINDOW = 80;
export type Sample = { t: number; x: number; y: number };

/** Add a pointer sample, dropping those older than the velocity window. */
export function track(samples: Sample[], s: Sample) {
  samples.push(s);
  while (samples.length > 2 && s.t - (samples[0]?.t ?? 0) > VELOCITY_WINDOW) samples.shift();
}

/** Pointer velocity in px/ms over the window ending at `end`; zero if the pointer had stopped. */
export function velocity(samples: readonly Sample[], end: Sample): Point {
  const first = samples.find((s) => end.t - s.t <= VELOCITY_WINDOW);
  const dt = first ? end.t - first.t : 0;
  if (!first || dt <= 0) return { x: 0, y: 0 };
  return { x: (end.x - first.x) / dt, y: (end.y - first.y) / dt };
}

/** Run `start` while `el` is on screen; it returns its own stop function. */
export function whileVisible(el: Element, start: () => () => void): () => void {
  let stop: (() => void) | null = null;
  const io = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) stop ??= start();
    else {
      stop?.();
      stop = null;
    }
  });
  io.observe(el);
  return () => {
    io.disconnect();
    stop?.();
  };
}

export type Frame = { now: number; dt: number; box: DOMRect; resized: boolean; pointer: Point | null };

/**
 * Run `tick` once per animation frame while `el` is on screen. `el`'s box is
 * read before tick writes anything, and re-read only after a resize or
 * scroll (`resized` flags that frame). tick returns false to sleep; a pointer
 * move, resize or `wake()` resumes it, so finished scenes cost nothing.
 */
export function frameLoop(el: Element, tick: (f: Frame) => boolean) {
  let wakeUp = () => {};
  const stop = whileVisible(el, () => {
    let box = el.getBoundingClientRect();
    let resized = true;
    let pointer: Point | null = null;
    let frame = 0;
    let last = performance.now();
    const run = (now: number) => {
      if (resized) box = el.getBoundingClientRect();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const keep = tick({ now, dt, box, resized, pointer });
      resized = false;
      frame = keep ? requestAnimationFrame(run) : 0;
    };
    const wake = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(run);
    };
    const markResized = () => {
      resized = true;
      wake();
    };
    const ro = new ResizeObserver(markResized);
    ro.observe(el);
    window.addEventListener("scroll", markResized, { passive: true });
    const offPointer = onPointer((p) => {
      pointer = p;
      wake();
    });
    wakeUp = wake;
    frame = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", markResized);
      offPointer();
      wakeUp = () => {};
    };
  });
  return { stop, wake: () => wakeUp() };
}

/** Play `keyframes` on `ref` every few seconds, like a blink. */
export function useBlink(ref: RefObject<Element | null>, keyframes: Keyframe[], duration: number) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer = window.setTimeout(function blink() {
      ref.current?.animate(keyframes, { duration, easing: "ease-in-out" });
      timer = window.setTimeout(blink, 2200 + Math.random() * 3200);
    }, 1200 + Math.random() * 1600);
    return () => window.clearTimeout(timer);
  }, [ref, keyframes, duration]);
}

/** A speech bubble that cycles through `lines`, each shown for `ms`. */
export function useSpeech(lines: readonly string[], ms = 2500) {
  const [line, setLine] = useState<string | null>(null);
  const index = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const sayNext = () => {
    setLine(lines[index.current % lines.length] ?? null);
    index.current += 1;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLine(null), ms);
  };
  return [line, sayNext] as const;
}
