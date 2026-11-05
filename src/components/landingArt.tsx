import { CLAY, INK, IVORY, MY_BLUE, MY_RED, MY_YELLOW, TEA } from "../brand";
import { type Layer, PixelArt, type Rect, Rects, raster, stripes } from "./pixel";

const WHITE = "#FFFFFF";

/* ---------------------------------------------------------------- cap
   A front-facing baseball cap in Clawd's art coordinates (head top at y 0,
   centre x 90), on a 5-unit grid. The crown carries the flag's crescent and
   14-pointed star as an embroidered patch on a finer 2-unit grid. */

const CROWN: readonly Rect[] = [
  [65, -45, 50, 5],
  [55, -40, 70, 5],
  [45, -35, 90, 5],
  [40, -30, 100, 22],
];
const PIPING: readonly Rect[] = [[40, -8, 100, 3]];
const VISOR: readonly Rect[] = [
  [34, -5, 112, 5],
  [26, 0, 128, 5],
];
const BUTTON: readonly Rect[] = [[85, -50, 10, 5]];

// Emblem grid: 28 x 15 pixels of 2 units, centred on the crown front.
const EM_COLS = 28;
const EM_ROWS = 15;
const EM_PX = 2;
const EM_X = 90 - (EM_COLS * EM_PX) / 2;
const EM_Y = -38;

function inCrescent(x: number, y: number) {
  const outer = Math.hypot(x - 7.6, y - 7.5) <= 6.6;
  const bite = Math.hypot(x - 9.8, y - 7.5) <= 5.6;
  return outer && !bite;
}

// 14 points, the first pointing straight up, edges straight between tips.
function inStar(x: number, y: number) {
  const R = 6.6;
  const r = 2.9;
  const seg = (2 * Math.PI) / 14;
  const dx = x - 20.4;
  const dy = y - 7.5;
  const a = Math.atan2(dy, dx) + Math.PI / 2;
  const local = ((a % seg) + seg) % seg;
  return Math.hypot(dx, dy) <= r + (R - r) * Math.abs(1 - (2 * local) / seg);
}

const EMBLEM = raster(EM_COLS, EM_ROWS, EM_PX, EM_X, EM_Y, (x, y) => inCrescent(x, y) || inStar(x, y));

const CAP: readonly Layer[] = [
  { rects: CROWN, fill: MY_BLUE },
  { rects: PIPING, fill: WHITE },
  { rects: VISOR, fill: MY_RED },
  { rects: BUTTON, fill: MY_YELLOW },
  { rects: EMBLEM, fill: MY_YELLOW },
];

export function CapArt() {
  return <PixelArt layers={CAP} outline={4} shadow={0} />;
}

/* ---------------------------------------------------------- parachute
   Canopy above Clawd (art coords), four gores in ivory and clay, with
   shroud lines down to the arms. */

const CANOPY_ROWS: readonly Rect[] = [
  [50, -125, 80, 10],
  [30, -115, 120, 10],
  [18, -105, 144, 10],
  [10, -95, 160, 22],
];
const CANOPY = stripes(CANOPY_ROWS, [50, 90, 130], [IVORY, CLAY]);

export function ChuteArt() {
  return (
    <>
      <g stroke={INK} strokeWidth="3" shapeRendering="geometricPrecision">
        <line x1="12" y1="-73" x2="14" y2="44" />
        <line x1="50" y1="-73" x2="22" y2="44" />
        <line x1="130" y1="-73" x2="158" y2="44" />
        <line x1="168" y1="-73" x2="166" y2="44" />
      </g>
      <PixelArt layers={CANOPY} outline={4} shadow={5} />
    </>
  );
}

/* --------------------------------------------------------------- plane
   Side-on, nose right, about 140 x 56 units. Up close it tows a banner. */

const PLANE: readonly Layer[] = [
  {
    fill: IVORY,
    rects: [
      [10, 20, 110, 20],
      [120, 24, 10, 16],
      [130, 29, 6, 11],
      [52, 40, 34, 8],
      [58, 48, 22, 6],
    ],
  },
  {
    fill: CLAY,
    rects: [
      [4, 2, 16, 18],
      [20, 10, 10, 10],
      [10, 34, 110, 6],
    ],
  },
  {
    fill: INK,
    rects: [
      [40, 25, 5, 5],
      [52, 25, 5, 5],
      [64, 25, 5, 5],
      [76, 25, 5, 5],
      [88, 25, 5, 5],
      [100, 25, 5, 5],
      [116, 25, 8, 5],
    ],
  },
];

/** The plane alone, without the towed banner. */
export function PlaneBodyArt() {
  return <PixelArt layers={PLANE} outline={4} shadow={5} />;
}

/** The towed "SFO → KUL" banner and its line, trailing left from the tail (x 4, y 30). */
export function BannerArt() {
  return (
    <>
      <line x1="4" y1="30" x2="-34" y2="32" stroke={INK} strokeWidth="2" shapeRendering="geometricPrecision" />
      <rect x="-200" y="17" width="166" height="30" fill={IVORY} stroke={INK} strokeWidth="4" />
      <text
        x="-117"
        y="38"
        textAnchor="middle"
        fontFamily="'JetBrains Mono Variable', ui-monospace, monospace"
        fontWeight="700"
        fontSize="17"
        letterSpacing="1"
        fill={INK}
      >
        SFO → KUL
      </text>
    </>
  );
}

/* ------------------------------------------------------------ suitcase */

const SUITCASE: readonly Layer[] = [
  { fill: IVORY, rects: [[0, 0, 44, 30]] },
  {
    fill: CLAY,
    rects: [
      [0, 12, 44, 6],
      [36, 3, 10, 8],
    ],
  },
  {
    fill: INK,
    rects: [
      [14, -7, 16, 3],
      [14, -7, 3, 7],
      [27, -7, 3, 7],
    ],
  },
];

export function SuitcaseArt() {
  return <PixelArt layers={SUITCASE} outline={4} shadow={4} />;
}

/* ----------------------------------------------------------------- mug
   A glass of milky tea held up on Clawd's right arm (art coords: the arm
   tops out at y 40, its tip at x 170), with pixel steam curling off it. */

const MUG: readonly Layer[] = [
  { fill: TEA, rects: [[148, 20, 24, 20]] },
  { fill: IVORY, rects: [[148, 12, 24, 8]] },
];
const STEAM: readonly Rect[] = [
  [154, 0, 4, 6],
  [158, -8, 4, 6],
  [154, -16, 4, 6],
  [164, -2, 4, 6],
  [168, -10, 4, 6],
];

export function MugArt() {
  return (
    <>
      <g className="mug-steam">
        <Rects rects={STEAM} fill={IVORY} />
      </g>
      <PixelArt layers={MUG} outline={4} shadow={3} />
    </>
  );
}
