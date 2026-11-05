import { type PointerEvent, useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, type Point, prefersReducedMotion } from "../motion";
import { plateSrcSet, siteName, stickers } from "../site";
import { play } from "../sound";

type Pos = { x: number; y: number; r: number; z: number };

// Initial scatter, in % of the board. Hand-placed so nothing hides on load.
const LAYOUT: readonly Pos[] = [
  { x: 3, y: 6, r: -6, z: 1 },
  { x: 21, y: 52, r: 5, z: 2 },
  { x: 40, y: 8, r: -3, z: 3 },
  { x: 57, y: 50, r: 7, z: 4 },
  { x: 76, y: 10, r: -8, z: 5 },
  { x: 2, y: 58, r: 4, z: 6 },
];

function scatter(): Pos[] {
  return stickers.map((_, i) => ({
    x: 2 + Math.random() * 76,
    y: 2 + Math.random() * 56,
    r: Math.round(Math.random() * 24 - 12),
    z: i + 1,
  }));
}

// Past an edge the sticker follows the pointer at this fraction of the overshoot.
const RUBBER = 0.2;
// A release faster than this (px/ms) throws the sticker on...
const THROW_SPEED = 0.11;
// ...by this many ms of its release velocity, clamped to the board.
const THROW_CARRY = 120;
// Release velocity is measured over the last stretch of the drag.
const VELOCITY_WINDOW = 80;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const rubber = (v: number, min: number, max: number) =>
  v < min ? min + (v - min) * RUBBER : v > max ? max + (v - max) * RUBBER : v;

type Sample = { t: number; x: number; y: number };

/** Pointer velocity in px/ms over the window ending at `end`; zero if the pointer had stopped. */
function velocity(samples: readonly Sample[], end: Sample): Point {
  const first = samples.find((s) => end.t - s.t <= VELOCITY_WINDOW);
  const dt = first ? end.t - first.t : 0;
  if (!first || dt <= 0) return { x: 0, y: 0 };
  return { x: (end.x - first.x) / dt, y: (end.y - first.y) / dt };
}

/** The translate a sticker shows right now: inline (dragging) or mid-animation. */
function shownTranslate(el: HTMLElement): Point {
  const [x = "0", y = "0"] = getComputedStyle(el).translate.split(" ");
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 };
}

type Drag = {
  i: number;
  el: HTMLDivElement;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  box: DOMRect;
  elastic: boolean;
  samples: Sample[];
};

/**
 * How stickers travel to the positions the next render commits. "move" is a
 * FLIP: each starts at its old on-screen spot and glides to the new one.
 */
type Settle =
  | { kind: "move"; from: Map<number, Point>; duration: number; stagger: number }
  | { kind: "fade" };

export function Stickers() {
  const boardRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const motion = useRef<(Animation | undefined)[]>([]);
  const settle = useRef<Settle | null>(null);
  const [pos, setPos] = useState<Pos[]>(() => [...LAYOUT]);
  const drag = useRef<Drag | null>(null);
  const topZ = useRef(LAYOUT.length);

  // Play the pending settle against the freshly committed layout, before paint.
  useLayoutEffect(() => {
    const s = settle.current;
    settle.current = null;
    if (!s) return;
    els.current.forEach((el, i) => {
      if (!el) return;
      if (s.kind === "fade") {
        motion.current[i]?.cancel();
        motion.current[i] = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
        return;
      }
      const from = s.from.get(i);
      if (!from) return;
      const dx = from.x - el.offsetLeft;
      const dy = from.y - el.offsetTop;
      if (Math.hypot(dx, dy) < 0.5) return;
      motion.current[i] = el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], {
        duration: s.duration,
        easing: EASE_OUT,
        delay: s.stagger * i,
        fill: "backwards",
      });
    });
  }, [pos]);

  /** Freeze sticker i where it is on screen, as a layout offset, and stop its motion. */
  const capture = (i: number): Point | null => {
    const el = els.current[i];
    if (!el) return null;
    const t = shownTranslate(el);
    motion.current[i]?.cancel();
    el.style.translate = "";
    return { x: el.offsetLeft + t.x, y: el.offsetTop + t.y };
  };

  const shuffle = () => {
    play("shuffle");
    drag.current = null;
    if (prefersReducedMotion()) {
      els.current.forEach((el, i) => {
        if (!el) return;
        el.style.translate = "";
        motion.current[i]?.cancel();
        motion.current[i] = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: "forwards" });
      });
      // A timer, not the finish event: animations freeze in background tabs.
      window.setTimeout(() => {
        settle.current = { kind: "fade" };
        setPos(scatter());
      }, 100);
      return;
    }
    const from = new Map<number, Point>();
    stickers.forEach((_, i) => {
      const p = capture(i);
      if (p) from.set(i, p);
    });
    settle.current = { kind: "move", from, duration: 400, stagger: 30 };
    setPos(scatter());
  };

  // While dragging, move the sticker with `translate` only (no layout, no
  // re-render); commit the new position to state on release.
  const onDown = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest("a")) return;
    const board = boardRef.current;
    if (!board) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    // Catch a sticker mid-flight where it is, not where it was heading.
    const at = shownTranslate(el);
    motion.current[i]?.cancel();
    el.style.translate = `${at.x}px ${at.y}px`;
    // Bounds for the offset, from the unrotated layout box.
    const box = new DOMRect(
      -el.offsetLeft,
      -el.offsetTop,
      board.clientWidth - el.offsetWidth,
      board.clientHeight - el.offsetHeight,
    );
    drag.current = {
      i,
      el,
      startX: e.clientX - at.x,
      startY: e.clientY - at.y,
      dx: at.x,
      dy: at.y,
      box,
      elastic: !prefersReducedMotion(),
      samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
    };
    play("pick", { jitter: { detune: 80 } });
    topZ.current += 1;
    const z = topZ.current;
    setPos((prev) => prev.map((q, j) => (j === i ? { ...q, z } : q)));
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const { box } = d;
    const fit = d.elastic ? rubber : clamp;
    d.dx = fit(e.clientX - d.startX, box.x, box.x + box.width);
    d.dy = fit(e.clientY - d.startY, box.y, box.y + box.height);
    d.el.style.translate = `${d.dx}px ${d.dy}px`;
    d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (d.samples.length > 2 && e.timeStamp - (d.samples[0]?.t ?? 0) > VELOCITY_WINDOW) d.samples.shift();
  };

  // Release: a fast flick carries on, anything past an edge springs back,
  // and both glide into the committed spot.
  const release = (e: PointerEvent<HTMLDivElement>, canThrow: boolean) => {
    const d = drag.current;
    const board = boardRef.current;
    drag.current = null;
    if (!d || !board) return;
    play("drop", { jitter: { detune: 60 } });
    const { box, el } = d;
    let x = d.dx;
    let y = d.dy;
    let thrown = false;
    if (canThrow && d.elastic) {
      const v = velocity(d.samples, { t: e.timeStamp, x: e.clientX, y: e.clientY });
      if (Math.hypot(v.x, v.y) > THROW_SPEED) {
        x += v.x * THROW_CARRY;
        y += v.y * THROW_CARRY;
        thrown = true;
      }
    }
    x = clamp(x, box.x, box.x + box.width);
    y = clamp(y, box.y, box.y + box.height);
    if (x !== d.dx || y !== d.dy) {
      const from = new Map([[d.i, { x: el.offsetLeft + d.dx, y: el.offsetTop + d.dy }]]);
      settle.current = { kind: "move", from, duration: thrown ? 300 : 200, stagger: 0 };
    }
    const left = ((el.offsetLeft + x) / board.clientWidth) * 100;
    const top = ((el.offsetTop + y) / board.clientHeight) * 100;
    el.style.translate = "";
    setPos((prev) => prev.map((q, j) => (j === d.i ? { ...q, x: left, y: top } : q)));
  };

  return (
    <div className="stickers">
      <div className="stickers-board" ref={boardRef}>
        {stickers.map((s, i) => {
          const p = pos[i];
          if (!p) return null;
          return (
            <div
              key={s.name}
              ref={(el) => {
                els.current[i] = el;
              }}
              className="sticker rv rv-slap"
              style={{
                left: `min(${p.x}%, calc(100% - var(--w)))`,
                top: `min(${p.y}%, calc(100% - var(--w)))`,
                zIndex: p.z,
                rotate: `${p.r}deg`,
              }}
              onPointerDown={onDown(i)}
              onPointerMove={onMove}
              onPointerUp={(e) => release(e, true)}
              onPointerCancel={(e) => release(e, false)}
            >
              <img
                src={s.src}
                srcSet={plateSrcSet(s.src)}
                sizes="260px"
                alt={`${siteName} — ${s.name}`}
                draggable={false}
                width="1080"
                height="1080"
                loading="lazy"
                decoding="async"
              />
              <a href={s.download} download className="sticker-dl" aria-label={`Download ${s.name} asset`}>
                ↓
              </a>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-ink rv" onClick={shuffle}>
        Shuffle ⤨
      </button>
    </div>
  );
}
