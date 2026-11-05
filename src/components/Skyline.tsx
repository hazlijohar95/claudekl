import { useId } from "react";
import { CLAY, INK, IVORY } from "../brand";
import { ModernArt, ModernText, StreetArt, StreetText } from "./streetArt";

/**
 * The skyline's coordinate system, shared with the scene drawn over it
 * (ClawdLanding): a 1200x400 viewBox, the ground line, the Petronas Towers'
 * centres and the skybridge between them.
 */
export const SCENE = { w: 1200, h: 400, ground: 380, towers: [550, 670], bridgeX: 610 } as const;
const GROUND = SCENE.ground;

// Petronas tower silhouette centred on `cx`: stepped setbacks up to a spire.
function petronas(cx: number) {
  return [
    `M${cx - 30} ${GROUND}`,
    `V170 H${cx - 25} V130 H${cx - 20} V105 H${cx - 14} V85 H${cx - 8} V62`,
    `L${cx} 14 L${cx + 8} 62`,
    `V85 H${cx + 14} V105 H${cx + 20} V130 H${cx + 25} V170 H${cx + 30} V${GROUND} Z`,
  ].join(" ");
}

// Sun: a disc with twelve rays, long and short in turn.
const SUN = { x: 455, y: 100, r: 30 };
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const from = SUN.r + 9;
  const to = from + (i % 2 ? 9 : 17);
  const p = (d: number) => [SUN.x + Math.cos(a) * d, SUN.y + Math.sin(a) * d].map((v) => Math.round(v * 10) / 10);
  return [...p(from), ...p(to)] as [number, number, number, number];
});

// Plain low-rise blocks: [x, roof y, width]. One sits under the sun; the rest
// carry the city on past the street (left) and the hall (right), out to where
// the widest screens end, so the skyline never trails off into bare ground.
// The landmarks at both ends are drawn in streetArt.tsx.
const BUILDINGS: ReadonlyArray<readonly [x: number, top: number, w: number]> = [
  [426, 282, 66],
  // left of the street
  [32, 296, 44],
  [-30, 258, 54],
  [-96, 290, 58],
  [-168, 240, 64],
  [-238, 300, 60],
  [-312, 266, 66],
  [-392, 296, 72],
  // right of the hall
  [1112, 298, 44],
  [1164, 252, 54],
  [1226, 288, 58],
  [1292, 236, 64],
  [1364, 294, 60],
  [1432, 262, 66],
  [1506, 298, 72],
];
// A centred grid of small windows, as many as the block comfortably holds.
const WINDOWS = BUILDINGS.flatMap(([x, top, w]) => {
  const cols = Math.max(1, Math.floor((w - 16) / 18));
  const rows = Math.min(5, Math.max(1, Math.floor((GROUND - top - 30) / 20)));
  const left = x + (w - (cols * 7 + (cols - 1) * 11)) / 2;
  return Array.from({ length: cols * rows }, (_, k) => [left + Math.floor(k / rows) * 18, top + 18 + (k % rows) * 20] as const);
});

export function Skyline({ className }: { className?: string }) {
  const filterId = useId().replace(/:/g, "");

  return (
    <svg className={className} viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </defs>
      {/* The sun hangs low on the left, between Merdeka 118 and the Petronas
          Towers: inside the strip phones still show, clear of the top-right
          sky where Claude FM opens. Only the static disc is filtered; the
          turning rays stay unfiltered so the wobble never re-renders. */}
      <g className="sky-sun" data-obstacle stroke={INK} strokeWidth="5" strokeLinecap="round">
        <g className="sky-sun-rays">
          {SUN_RAYS.map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
        <circle filter={`url(#${filterId})`} cx={SUN.x} cy={SUN.y} r={SUN.r} fill={IVORY} />
      </g>
      {/* data-obstacle marks the shapes Claude FM's card avoids covering.
          Outline-only buildings are filled with the sky's clay so the plane,
          drawn behind them while far off, is hidden by them. */}
      <g filter={`url(#${filterId})`} stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {BUILDINGS.map(([x, top, w]) => (
          <rect key={x} data-obstacle x={x} y={top} width={w} height={GROUND - top} fill={CLAY} />
        ))}
        {WINDOWS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="7" height="9" fill={INK} stroke="none" />
        ))}

        {/* Merdeka 118 */}
        <path data-obstacle d="M330 380 L336 168 L348 122 L358 74 H370 L380 122 L392 168 L398 380 Z" fill={IVORY} />
        <path
          d="M336 168 L364 206 L392 168 M348 122 L364 150 L380 122 M340 250 L364 286 L388 250 M334 330 L364 366 L394 330"
          fill="none"
          strokeWidth="3.5"
        />
        <path data-obstacle d="M364 74 V6" fill="none" strokeWidth="4" />

        {/* Petronas Twin Towers + skybridge */}
        {SCENE.towers.map((cx) => (
          <path key={cx} data-obstacle d={petronas(cx)} fill={IVORY} />
        ))}
        <rect x="580" y="224" width="60" height="12" fill={IVORY} />
        <path d={`M${SCENE.bridgeX} 236 L582 292 M${SCENE.bridgeX} 236 L638 292`} fill="none" strokeWidth="4" />
        {[200, 250, 300, 340].map((y) => (
          <path key={y} d={`M528 ${y} H572 M648 ${y} H692`} fill="none" strokeWidth="3" />
        ))}

        <StreetArt />
        <ModernArt />

        {/* Menara KL */}
        <g data-obstacle>
          <path d="M746 380 L753 176 H767 L774 380 Z" fill={IVORY} />
          <path d="M726 168 C726 150 794 150 794 168 C794 186 726 186 726 168 Z" fill={IVORY} />
          <path d="M728 168 H792" fill="none" strokeWidth="3" />
          <rect x="749" y="134" width="22" height="20" fill={IVORY} />
          <path d="M760 134 V36" fill="none" strokeWidth="4" />
        </g>
      </g>
      <StreetText />
      <ModernText ledId={`${filterId}-led`} />
      {/* The road the city stands on, its top edge the ground line: straight
          and page-wide, so outside the filter (a filter region this wide
          would be expensive for no visible wobble). It runs past the bottom
          of the viewBox into the hero's bottom edge. */}
      <rect x="-2400" y={GROUND - 3} width="6000" height="60" fill={INK} />
      <path d={`M-2400 ${GROUND + 10} H3600`} stroke={IVORY} strokeWidth="2.5" strokeDasharray="16 14" fill="none" />
    </svg>
  );
}
