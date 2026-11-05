import { useEffect, useEffectEvent, useId, useRef } from "react";
import { CLAY, INK, IVORY } from "../brand";
import { EASE_HOP, onPointer, prefersReducedMotion, useBlink, useSpeech, whileVisible } from "../motion";
import { kancilLines } from "../site";
import { play } from "../sound";
import { Bubble } from "./Bubble";

const PUPIL_RANGE = 4.5;
const BLINK: Keyframe[] = [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }, { transform: "scaleY(0)" }];

type Props = {
  /** Increment to make the kancil hop and talk from outside. */
  poke?: number;
};

// The viewBox ends at the hoof line, so the host can stand it on a ground
// line with `bottom` alone; the shadow draws below via overflow.
export function Kancil({ poke = 0 }: Props) {
  const filterId = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const eyeRef = useRef<SVGEllipseElement>(null);
  const pupilRef = useRef<SVGGElement>(null);
  const lidRef = useRef<SVGGElement>(null);
  const [line, sayNext] = useSpeech(kancilLines, 2600);
  useBlink(lidRef, BLINK, 180);

  // Pupils follow the pointer, only while this kancil is on screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return whileVisible(root, () => {
      let frame = 0;
      let x = 0;
      let y = 0;
      const update = () => {
        frame = 0;
        const eye = eyeRef.current;
        const pupil = pupilRef.current;
        if (!eye || !pupil) return;
        const box = eye.getBoundingClientRect();
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / 240) * PUPIL_RANGE;
        pupil.setAttribute("transform", `translate(${(dx / dist) * reach} ${(dy / dist) * reach})`);
      };
      const off = onPointer((p) => {
        x = p.x;
        y = p.y;
        if (!frame) frame = requestAnimationFrame(update);
      });
      return () => {
        off();
        cancelAnimationFrame(frame);
      };
    });
  }, []);

  const talk = () => {
    sayNext();
    play("kancilHop", { jitter: { detune: 60 } });
    if (prefersReducedMotion()) return;
    bodyRef.current?.animate(
      [
        { transform: "translateY(0) scale(1, 1)" },
        { transform: "translateY(4px) scale(1.06, 0.92)", offset: 0.15 },
        { transform: "translateY(-38px) scale(0.96, 1.05)", offset: 0.5 },
        { transform: "translateY(2px) scale(1.05, 0.94)", offset: 0.85 },
        { transform: "translateY(0) scale(1, 1)" },
      ],
      { duration: 620, easing: EASE_HOP },
    );
  };

  const onPoke = useEffectEvent(talk);
  useEffect(() => {
    if (poke > 0) onPoke();
  }, [poke]);

  return (
    <button ref={rootRef} type="button" className="kancil" onClick={talk} aria-label="Sang Kancil, our mascot. Click to say hi.">
      <Bubble line={line} />
      <svg viewBox="0 0 300 268" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="3" />
          </filter>
        </defs>
        <ellipse cx="150" cy="268" rx="92" ry="7" fill={INK} opacity="0.18" />
        <g ref={bodyRef} className="kancil-body" style={{ transformOrigin: "150px 268px" }}>
          <g filter={`url(#${filterId})`} stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            {/* far legs */}
            <path d="M112 200 L106 262 M100 263 H112" fill="none" />
            <path d="M200 200 L208 258 M203 259 H215" fill="none" />
            {/* ears */}
            <g className="kancil-ears">
              <path d="M216 76 C216 62 224 52 236 50 C239 62 232 72 224 80 Z" fill={IVORY} />
              <path d="M221 71 C222 63 226 58 232 56 C232 63 228 68 224 72 Z" fill={CLAY} stroke="none" />
              <path d="M202 80 C194 68 192 56 198 48 C208 54 212 66 212 78 Z" fill={IVORY} />
              <path d="M204 73 C200 66 199 59 201 54 C206 58 208 65 208 72 Z" fill={CLAY} stroke="none" />
            </g>
            {/* tail */}
            <path d="M84 152 C66 146 60 132 68 122 C74 134 82 140 92 144" fill={IVORY} />
            {/* body + neck */}
            <path
              d="M86 150 C100 128 140 126 170 128 C182 120 192 108 202 100 L224 116 C217 130 213 142 215 160 C219 192 202 216 165 218 C125 220 90 215 78 192 C72 178 76 160 86 150 Z"
              fill={IVORY}
            />
            {/* coat marks */}
            <path d="M120 150 C135 144 150 144 162 148" fill="none" strokeWidth="3.5" />
            <path d="M198 140 C203 146 205 152 203 160" fill="none" strokeWidth="3.5" />
            {/* near legs */}
            <path d="M132 212 L128 266 M122 267 H135" fill="none" />
            <path d="M176 212 L182 266 M177 267 H190" fill="none" />
            {/* lanyard + badge */}
            <path d="M204 118 L213 150 L227 120" fill="none" strokeWidth="3" />
            <g transform="rotate(-8 214 160)">
              <rect x="199" y="150" width="30" height="22" fill={CLAY} strokeWidth="3.5" />
              <text
                x="214"
                y="166"
                textAnchor="middle"
                fontFamily="Space Grotesk Variable, sans-serif"
                fontWeight="700"
                fontSize="12"
                fill={INK}
                stroke="none"
              >
                KL
              </text>
            </g>
            {/* head */}
            <path
              d="M196 100 C190 78 206 62 228 64 C246 66 258 80 270 94 C276 100 276 108 268 111 C254 116 240 122 226 124 C208 126 199 116 196 100 Z"
              fill={IVORY}
            />
            <ellipse cx="269" cy="99" rx="5.5" ry="4.5" fill={INK} />
            <path d="M255 113 Q260 118 266 113" fill="none" strokeWidth="3" />
            <ellipse cx="246" cy="107" rx="6" ry="3.5" fill={CLAY} stroke="none" opacity="0.85" />
          </g>
          {/* eye stays crisp so it reads at small sizes */}
          <ellipse ref={eyeRef} cx="230" cy="88" rx="12" ry="13" fill="#fff" stroke={INK} strokeWidth="4" />
          <g ref={pupilRef}>
            <circle cx="231" cy="89" r="7.5" fill={INK} />
            <circle cx="228.5" cy="86" r="2.6" fill="#fff" />
          </g>
          <g ref={lidRef} style={{ transformOrigin: "230px 75px", transform: "scaleY(0)" }}>
            <ellipse cx="230" cy="88" rx="12" ry="13" fill={IVORY} stroke={INK} strokeWidth="4" />
            <path d="M219 90 Q230 96 241 90" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </button>
  );
}
