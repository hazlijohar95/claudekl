import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../motion";
import { claudeFm } from "../site";
import { play } from "../sound";

const ORIGIN = "https://www.youtube-nocookie.com";

// CRT power on: a dot, a hot horizontal line, then the picture springs open.
const POWER_ON: Keyframe[] = [
  { transform: "scale(0.03, 0.01)", filter: "brightness(4)", offset: 0 },
  { transform: "scale(1.04, 0.012)", filter: "brightness(3)", offset: 0.38, easing: "cubic-bezier(.2,.9,.3,1)" },
  { transform: "scale(1, 1.06)", filter: "brightness(1.6)", offset: 0.78, easing: "cubic-bezier(.3,1.4,.5,1)" },
  { transform: "scale(1, 1)", filter: "brightness(1)", offset: 1 },
];
// CRT power off: collapse to a line, then to a dot, then gone.
const POWER_OFF: Keyframe[] = [
  { transform: "scale(1, 1)", filter: "brightness(1)", opacity: 1, offset: 0 },
  { transform: "scale(1.02, 0.012)", filter: "brightness(3)", opacity: 1, offset: 0.45, easing: "cubic-bezier(.6,0,.8,.4)" },
  { transform: "scale(0.03, 0.01)", filter: "brightness(4)", opacity: 1, offset: 0.8 },
  { transform: "scale(0, 0)", filter: "brightness(4)", opacity: 0, offset: 1 },
];
const FADE: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

type Phase = "off" | "on" | "closing";
type Place = "below" | "left";

const GAP = 12;

function overlap(a: DOMRect, b: DOMRect) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * What the card must not cover: the skyline shapes Skyline.tsx marks with
 * data-obstacle, and the hero title's actual glyphs (not its full-width line
 * boxes).
 */
function obstacles(): DOMRect[] {
  const rects: DOMRect[] = [];
  for (const el of document.querySelectorAll(".skyline [data-obstacle]")) rects.push(el.getBoundingClientRect());
  for (const line of document.querySelectorAll(".hero-title > span")) {
    const range = document.createRange();
    range.selectNodeContents(line);
    rects.push(range.getBoundingClientRect());
  }
  return rects;
}

/** Below the pill, or beside it to the left: whichever covers least. */
function choosePlace(pill: DOMRect, w: number, h: number): Place {
  const below = new DOMRect(pill.right - w, pill.bottom + GAP, w, h);
  const left = new DOMRect(pill.left - GAP - w, pill.top, w, h);
  const obs = obstacles();
  const cost = (r: DOMRect) => (r.left < 0 ? Infinity : obs.reduce((sum, o) => sum + overlap(r, o), 0));
  return cost(left) < cost(below) ? "left" : "below";
}

/**
 * A radio pill in the hero corner. Tapping it switches on a tiny CRT that
 * plays Claude FM; tapping again (or ✕ / Esc) switches it off.
 *
 * The player stays visible while it plays, at YouTube's 200x200 minimum (a
 * tiny square CRT, the stream letterboxed inside):
 * its embed policy doesn't allow hidden, audio-only players. Player state
 * comes back over YouTube's postMessage protocol (the one its IFrame API
 * uses), so the static clears and the equaliser moves only once the stream
 * is really playing.
 */
export function ClaudeFM() {
  const [phase, setPhase] = useState<Phase>("off");
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const shown = phase !== "off";
  const [place, setPlace] = useState<Place>("below");

  const post = (msg: object) => frameRef.current?.contentWindow?.postMessage(JSON.stringify(msg), ORIGIN);

  // Switch on: pick the clearest spot, then run the CRT animation as the
  // card mounts. Re-place (once per frame at most) on resize while open.
  useLayoutEffect(() => {
    if (phase !== "on") return;
    const card = cardRef.current;
    const reposition = () => {
      const pill = pillRef.current;
      if (pill && card) setPlace(choosePlace(pill.getBoundingClientRect(), card.offsetWidth, card.offsetHeight));
    };
    reposition();
    const reduced = prefersReducedMotion();
    card?.animate(reduced ? FADE : POWER_ON, { duration: reduced ? 160 : 560, fill: "backwards" });

    let frame = 0;
    const onResize = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          reposition();
        });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [phase]);

  const switchOff = () => {
    if (phase !== "on") return;
    post({ event: "command", func: "pauseVideo", args: [] }); // silence at once; the picture collapses after
    setPlaying(false);
    setPhase("closing");
    play("tap");
    const reduced = prefersReducedMotion();
    const duration = reduced ? 140 : 380;
    cardRef.current?.animate(reduced ? [...FADE].reverse() : POWER_OFF, { duration, fill: "forwards" });
    // Unmount on a timer, not the animation's finish event: animations freeze
    // in background tabs, and the player must still go away.
    window.setTimeout(() => setPhase("off"), duration);
  };

  const switchOn = () => {
    if (phase === "closing") return;
    setPhase("on");
    play("soundOn");
  };

  const onEscape = useEffectEvent(() => {
    switchOff();
    pillRef.current?.focus();
  });

  useEffect(() => {
    if (phase !== "on") return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== ORIGIN || e.source !== frameRef.current?.contentWindow || typeof e.data !== "string") return;
      try {
        const msg: unknown = JSON.parse(e.data);
        if (typeof msg !== "object" || msg === null || !("info" in msg)) return;
        const info = msg.info;
        if (typeof info === "object" && info !== null && "playerState" in info) setPlaying(info.playerState === 1);
      } catch {
        // not a player message
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase]);


  return (
    <div className="fm" data-open={phase === "on" ? "" : undefined}>
      <button
        ref={pillRef}
        type="button"
        className="fm-pill"
        aria-expanded={phase === "on"}
        aria-controls="claude-fm"
        onClick={() => (phase === "on" ? switchOff() : switchOn())}
      >
        <span className="fm-eq" data-playing={playing ? "" : undefined} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>Claude FM</span>
        <span className="fm-state">{phase === "on" ? (playing ? "On air" : "Tuning…") : "Play ▶"}</span>
      </button>

      {shown && (
        <div ref={cardRef} id="claude-fm" className="fm-card" data-place={place} role="region" aria-label="Claude FM player">
          <div className="fm-card-top">
            <span className="fm-led" data-playing={playing ? "" : undefined} aria-hidden="true" />
            <span className="fm-title">Claude FM · live</span>
            <a href={claudeFm.url} target="_blank" rel="noreferrer" data-sound="tap" aria-label="Open Claude FM on YouTube">
              ↗
            </a>
            <button type="button" className="fm-close" aria-label="Stop Claude FM" onClick={switchOff}>
              ✕
            </button>
          </div>
          <div className="fm-screen">
            <iframe
              ref={frameRef}
              src={`${ORIGIN}/embed/${claudeFm.videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
              title="Claude FM: music for thinking and building"
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => post({ event: "listening", id: "claude-fm", channel: "widget" })}
            />
            <span className="fm-static" data-hidden={playing ? "" : undefined} aria-hidden="true" />
            <span className="fm-scanlines" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  );
}
