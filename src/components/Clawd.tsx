import { type Ref, useEffect, useEffectEvent, useRef } from "react";
import { CLAY, INK, IVORY } from "../brand";
import { EASE_HOP, frameLoop, prefersReducedMotion, useBlink, useSpeech } from "../motion";
import { clawdLines } from "../site";
import { play } from "../sound";
import { Bubble } from "./Bubble";
import { type Layer, PixelArt, type Rect, Rects } from "./pixel";

// Clawd on the Claude Code pixel grid: 1 col = 10 units, 1 row = 20 units
// (terminal half-blocks are twice as tall as they are wide). Art spans
// x 10..170, y 0..100; the outline reaches y 105, the feet line.
const BODY: readonly Rect[] = [
  [30, 0, 120, 40], // head rows
  [10, 40, 160, 20], // arms
  [30, 60, 120, 20], // belly
];
const LEGS_A: readonly Rect[] = [
  [40, 80, 10, 20],
  [60, 80, 10, 20],
  [110, 80, 10, 20],
  [130, 80, 10, 20],
];
// Mid-stride: one diagonal pair lifts.
const LEGS_B: readonly Rect[] = [
  [40, 80, 10, 10],
  [60, 80, 10, 20],
  [110, 80, 10, 20],
  [130, 80, 10, 10],
];
const EYES: readonly Rect[] = [
  [50, 20, 10, 20],
  [120, 20, 10, 20],
];
// Pixel shades: two lenses wide enough to cover the eyes at any look offset,
// a bridge, arms back to the head edges, and a glint in each lens.
const SHADES: readonly Rect[] = [
  [36, 16, 36, 22],
  [108, 16, 36, 22],
  [72, 20, 36, 6],
  [30, 20, 6, 6],
  [144, 20, 6, 6],
];
const GLINTS: readonly Rect[] = [
  [42, 21, 8, 4],
  [114, 21, 8, 4],
];
const STEP_A: readonly Layer[] = [{ rects: [...BODY, ...LEGS_A], fill: CLAY }];
const STEP_B: readonly Layer[] = [{ rects: [...BODY, ...LEGS_B], fill: CLAY }];

export const CLAWD_CENTER_X = 90;
export const CLAWD_FEET_Y = 105;
export const CLAWD_BODY_CENTRE = CLAWD_FEET_Y / 2;

// The eyes shift this many art units to look sideways; SHADES cover the range.
const LOOK = 10;
export const eyesAt = (look: number) => `translate(${look * LOOK} 0)`;
/** -1, 0 or 1: which way to look at something dx away, with a dead zone. */
export const lookToward = (dx: number, deadzone: number) => (Math.abs(dx) < deadzone ? 0 : Math.sign(dx));
// Jump and chirp, shared by every Clawd so they sound the same.
export function playClawdPoke() {
  play("clawdJump", { jitter: { detune: 80 } });
  play("clawdTalk", { jitter: { detune: 120 } });
}

const SPEED = 46; // px per second
export const CLAWD_BLINK: Keyframe[] = [{ transform: "scaleY(1)" }, { transform: "scaleY(0.15)" }, { transform: "scaleY(1)" }];

/**
 * Clawd's sprite: two walk frames (CSS shows one by the host's data-step),
 * plus eyes the host can shift (look) and lids it can blink. `shades` puts
 * sunglasses over the eyes.
 */
export function ClawdArt({ eyesRef, lidsRef, shades = false }: { eyesRef: Ref<SVGGElement>; lidsRef: Ref<SVGGElement>; shades?: boolean }) {
  return (
    <g className="clawd-body">
      <g className="clawd-step-a">
        <PixelArt layers={STEP_A} />
      </g>
      <g className="clawd-step-b">
        <PixelArt layers={STEP_B} />
      </g>
      <g ref={eyesRef}>
        <g ref={lidsRef} style={{ transformOrigin: "0 30px" }}>
          <Rects rects={EYES} fill={INK} />
        </g>
      </g>
      {shades && (
        <g>
          <Rects rects={SHADES} fill={INK} />
          <Rects rects={GLINTS} fill={IVORY} />
        </g>
      )}
    </g>
  );
}

type Props = {
  /** Increment to make Clawd do a flip. */
  dance?: number;
  /** Layout slot class; Clawd patrols the slot's width. */
  className?: string;
};

// The viewBox ends at the bottom of the leg outline, so the host stands Clawd
// on a ground line with `bottom` alone; the hard shadow draws below.
export function Clawd({ dance = 0, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLButtonElement>(null);
  const spriteRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const lidsRef = useRef<SVGGElement>(null);
  const hovered = useRef(false);
  const busyUntil = useRef(0);
  const [line, sayNext] = useSpeech(clawdLines, 2400);
  useBlink(lidsRef, CLAWD_BLINK, 160);

  // Patrol loop: walk, pause, turn at the edges, watch the pointer. It only
  // runs while Clawd is on screen, and only writes the DOM when something moved.
  useEffect(() => {
    const track = trackRef.current;
    const bot = botRef.current;
    if (!track || !bot) return;
    const moving = !prefersReducedMotion();
    let x = -1;
    let max = 0;
    let dir = Math.random() < 0.5 ? -1 : 1;
    let pauseUntil = 0;
    let stepAt = 0;
    let step = 0;
    let shown = { x: "", step: -1, look: 2 };

    return frameLoop(track, ({ now, dt, box, resized, pointer }) => {
      if (resized) {
        max = Math.max(0, track.clientWidth - bot.offsetWidth);
        if (x < 0) x = moving ? Math.random() * max : max / 2;
        x = Math.min(x, max);
      }
      const walking = moving && !hovered.current && now > pauseUntil && now > busyUntil.current;
      if (walking) {
        x += dir * SPEED * dt;
        if (x <= 0 || x >= max) {
          x = Math.min(Math.max(x, 0), max);
          dir *= -1;
          pauseUntil = now + 500;
        } else if (Math.random() < dt * 0.25) {
          pauseUntil = now + 700 + Math.random() * 1600;
        }
        if (now > stepAt) {
          step ^= 1;
          stepAt = now + 140;
        }
      } else {
        step = 0;
      }

      // Eyes: follow a nearby pointer, otherwise look where we're going.
      let look = walking ? dir : 0;
      if (pointer) {
        const w = bot.offsetWidth;
        const dx = pointer.x - (box.left + x + w / 2);
        const dy = pointer.y - (box.top + bot.offsetHeight / 2);
        if (Math.hypot(dx, dy) < 420) look = lookToward(dx, w / 4);
      }

      const tx = x.toFixed(1);
      if (tx !== shown.x) bot.style.transform = `translateX(${tx}px)`;
      if (step !== shown.step) bot.dataset.step = String(step);
      if (look !== shown.look) eyesRef.current?.setAttribute("transform", eyesAt(look));
      shown = { x: tx, step, look };
      return moving;
    }).stop;
  }, []);

  const jump = (flip: boolean) => {
    sayNext();
    if (flip) play("leap", { jitter: { detune: 80 } });
    playClawdPoke();
    if (prefersReducedMotion()) return;
    busyUntil.current = performance.now() + (flip ? 900 : 600);
    spriteRef.current?.animate(
      flip
        ? [
            { transform: "translateY(0) rotate(0) scale(1,1)" },
            { transform: "translateY(6%) rotate(0) scale(1.1,0.85)", offset: 0.15 },
            { transform: "translateY(-90%) rotate(-180deg) scale(1,1)", offset: 0.55 },
            { transform: "translateY(4%) rotate(-360deg) scale(1.1,0.88)", offset: 0.88 },
            { transform: "translateY(0) rotate(-360deg) scale(1,1)" },
          ]
        : [
            { transform: "translateY(0) scale(1,1)" },
            { transform: "translateY(6%) scale(1.12,0.84)", offset: 0.18 },
            { transform: "translateY(-60%) scale(0.94,1.08)", offset: 0.5 },
            { transform: "translateY(4%) scale(1.1,0.88)", offset: 0.85 },
            { transform: "translateY(0) scale(1,1)" },
          ],
      { duration: flip ? 900 : 560, easing: EASE_HOP },
    );
  };

  const onDance = useEffectEvent(() => jump(true));
  useEffect(() => {
    if (dance > 0) onDance();
  }, [dance]);

  return (
    <div ref={trackRef} className={`clawd-track ${className ?? ""}`}>
      <button
        ref={botRef}
        type="button"
        className="clawd"
        aria-label="Clawd, the Claude Code mascot. Click to make it jump."
        onClick={() => jump(false)}
        onPointerEnter={() => {
          hovered.current = true;
        }}
        onPointerLeave={() => {
          hovered.current = false;
        }}
      >
        <Bubble line={line} />
        <svg ref={spriteRef} viewBox="-8 -8 196 113" shapeRendering="crispEdges" aria-hidden="true">
          <ClawdArt eyesRef={eyesRef} lidsRef={lidsRef} />
        </svg>
      </button>
    </div>
  );
}
