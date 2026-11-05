import { CLAY, INK, IVORY } from "../brand";

/*
 * The skyline's two ends, in its 1200x400 coordinates (ground at y 380).
 * Left: a street of shophouses (noodles, a 24-hour mamak, satay); the hero
 * Clawds walk to the mamak for a cup. Right: Menara Maybank, then a conference
 * hall under an LED billboard.
 *
 * Placement follows what each screen shape crops to: phones show about
 * x 314..886 and 16:10 desktops about 46..1154. The street and the hall sit
 * wholly outside the phone strip and inside the desktop one, and Maybank
 * wholly inside both, so no screen slices a building at its edge.
 *
 * Both ends keep to the skyline's palette: ink lines, ivory and clay. Each
 * comes in two parts: the drawing, which goes inside Skyline's hand-drawn
 * wobble filter, and its lettering, which stays outside it so it reads cleanly.
 */

const GROUND = 380;
const MONO = "'JetBrains Mono Variable', ui-monospace, monospace";
const SANS = "'Space Grotesk Variable', system-ui, sans-serif";

/** The mamak, for its tap target and the Clawds' seats (ClawdLanding). */
export const MAMAK = { x0: 84, x1: 306, top: 186, centre: 196, seats: { kl: 157, sf: 235 } } as const;

/* ------------------------------------------------------ the old street */

// A plain shophouse: body, a cornice line, an ink signboard, a canvas awning
// and an open shop front. The two share their inner walls with the mamak in
// the middle, which is drawn over them.
type Shop = { x: number; w: number; top: number; sign: string };
const SIDE_SHOPS: readonly Shop[] = [
  { x: 88, w: 70, top: 240, sign: "NOODLES" },
  { x: 234, w: 68, top: 250, sign: "SATAY" },
];
const SIGN_Y = 296;
const AWNING_Y = 316;

function SideShop({ x, w, top }: Shop) {
  return (
    <g>
      <rect data-obstacle x={x} y={top} width={w} height={GROUND - top} fill={CLAY} />
      <path d={`M${x - 4} ${top} H${x + w + 4}`} fill="none" />
      {[x + 10, x + w - 24].map((wx) => (
        <rect key={wx} x={wx} y={top + 14} width="14" height="22" fill="none" strokeWidth="3" />
      ))}
      <rect x={x + 4} y={SIGN_Y} width={w - 8} height="16" fill={INK} />
      <path d={`M${x + 2} ${AWNING_Y} H${x + w - 2} L${x + w + 2} ${AWNING_Y + 12} H${x - 2} Z`} fill={IVORY} strokeWidth="3" />
      <rect x={x + 6} y={AWNING_Y + 18} width={w - 12} height={GROUND - AWNING_Y - 18} fill="none" strokeWidth="3" />
    </g>
  );
}

export function StreetArt() {
  return (
    <g>
      {SIDE_SHOPS.map((shop) => (
        <SideShop key={shop.sign} {...shop} />
      ))}

      {/* The mamak: taller, ivory, a gable carrying its hours, arched
          windows, a lit shop front. */}
      <rect data-obstacle x="158" y="214" width="76" height={GROUND - 214} fill={IVORY} />
      <path d="M162 206 Q196 166 230 206 Z" fill={IVORY} />
      <rect x="154" y="206" width="84" height="10" fill={IVORY} />
      {[168, 204].map((x) => (
        <path key={x} d={`M${x} 256 V236 Q${x + 10} 224 ${x + 20} 236 V256 Z`} fill="none" strokeWidth="3" />
      ))}
      <rect x="162" y="270" width="68" height="22" fill={INK} />
      <path d="M160 300 H232 L238 314 H154 Z" fill={IVORY} strokeWidth="3" />
      <rect x="166" y="320" width="60" height={GROUND - 320} fill={INK} />
      <g stroke="none" fill={IVORY}>
        {[172, 184, 196, 208, 220].map((x) => (
          <circle key={x} cx={x} cy="328" r="2" />
        ))}
      </g>

      {/* Out front: a marble-top table, its leg drawn light against the dark shop. */}
      <path d="M196 356 V377 M188 377 H204" fill="none" stroke={IVORY} strokeWidth="3" />
      <rect x="181" y="350" width="30" height="6" fill={IVORY} strokeWidth="3" />
    </g>
  );
}

export function StreetText() {
  return (
    <g fontFamily={SANS} fontWeight="700" textAnchor="middle" fill={IVORY}>
      {SIDE_SHOPS.map(({ x, w, sign }) => (
        <text key={sign} x={x + w / 2} y={SIGN_Y + 11.5} fontSize="8.5" letterSpacing="1">
          {sign}
        </text>
      ))}
      <text x="196" y="285.5" fontSize="12" letterSpacing="2">
        MAMAK
      </text>
      <text x="196" y="200" fontFamily={MONO} fontSize="6.5" letterSpacing="0.4" fill={INK}>
        24 HOURS
      </text>
    </g>
  );
}

/* ------------------------------------------------------- the new KL */

export const BOARD = { x: 942, y: 222, w: 144, h: 40 } as const;
/** The conference hall: tap target, its glass front and door, and where the Clawds queue to go in. */
export const HALL = {
  x0: 924,
  x1: 1104,
  top: 216,
  centre: 1014,
  glass: { x: 939, y: 341, w: 150, h: 39 }, // below the banner
  door: { x: 999, y: 350, w: 30 },
  seats: { kl: 996, sf: 1032 },
} as const;
// The billboard cycles these; app.css times them (.billboard-line).
const BOARD_LINES = ["Keep thinking.", "Code with Claude", "Build together.", "Ship it, KL.", "Hello, KL."];
const HALL_MULLIONS = Array.from({ length: 10 }, (_, i) => 951 + i * 14);
// Menara Maybank's two blocks, interlocking at a corner, their roofs slanting
// opposite ways so the top rises to a point: a sheathed keris, pointing up.
const MAYBANK = {
  front: { x0: 806, x1: 850, low: 182, high: 140 }, // roof rises to the right
  back: { x0: 834, x1: 878, high: 156, low: 186 }, // roof falls to the right
} as const;
const floors = (from: number, x0: number, x1: number) =>
  Array.from({ length: Math.floor((GROUND - 8 - from) / 13) }, (_, i) => `M${x0} ${from + i * 13} H${x1}`).join(" ");

export function ModernArt() {
  return (
    <g>
      {/* Menara Maybank: the back block first, the front block over it. */}
      <path
        data-obstacle
        d={`M${MAYBANK.back.x0} ${GROUND} V${MAYBANK.back.high} L${MAYBANK.back.x1} ${MAYBANK.back.low} V${GROUND} Z`}
        fill={IVORY}
      />
      <path d={floors(196, MAYBANK.front.x1, MAYBANK.back.x1)} fill="none" strokeWidth="2" />
      <path
        data-obstacle
        d={`M${MAYBANK.front.x0} ${GROUND} V${MAYBANK.front.low} L${MAYBANK.front.x1} ${MAYBANK.front.high} V${GROUND} Z`}
        fill={IVORY}
      />
      <path d={floors(194, MAYBANK.front.x0, MAYBANK.front.x1)} fill="none" strokeWidth="2" />
      {/* Its corner entrance under a tiered triangular canopy. */}
      <path d="M836 380 V368 L850 358 L864 368 V380" fill={IVORY} strokeWidth="2.5" />

      <circle cx="1014" cy="280" r="10" fill={IVORY} strokeWidth="3" />

      {/* Billboard on stilts above the hall. */}
      <path d={`M976 ${BOARD.y + BOARD.h} V296 M1052 ${BOARD.y + BOARD.h} V294`} fill="none" strokeWidth="4" />
      <rect data-obstacle x={BOARD.x - 6} y={BOARD.y - 6} width={BOARD.w + 12} height={BOARD.h + 12} fill={IVORY} />
      <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} fill={INK} strokeWidth="3" />

      {/* Conference hall: a swooping roof over a glass front. */}
      <rect data-obstacle x="938" y="316" width="152" height={GROUND - 316} fill={CLAY} />
      <path d={HALL_MULLIONS.map((x) => `M${x} 316 V${GROUND}`).join(" ")} fill="none" strokeWidth="2.5" />
      <path d="M938 346 H1090" fill="none" strokeWidth="2.5" />
      <path d="M924 322 C956 294 1040 280 1104 304 L1104 314 C1042 294 958 306 924 330 Z" fill={IVORY} />
      <rect x="958" y="326" width="112" height="14" fill={INK} />
      <rect x="999" y="350" width="30" height={GROUND - 350} fill={INK} />
      <path d={`M1014 352 V${GROUND}`} fill="none" stroke={IVORY} strokeWidth="2" />

    </g>
  );
}

export function ModernText({ ledId }: { ledId: string }) {
  return (
    <g>
      <defs>
        {/* LED grid: thin dark lines over the screen, so the text reads as lamps. */}
        <pattern id={ledId} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
          <path d="M0 0 H2.6 M0 0 V2.6" stroke={INK} strokeWidth="0.6" opacity="0.7" />
        </pattern>
      </defs>
      <g fontFamily={MONO} fontWeight="800" fontSize="14" textAnchor="middle" fill={CLAY}>
        {BOARD_LINES.map((line) => (
          <text key={line} className="billboard-line" x={BOARD.x + BOARD.w / 2} y={BOARD.y + 25.5}>
            {line}
          </text>
        ))}
      </g>
      <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} fill={`url(#${ledId})`} />
      {/* The community's spark over the hall, between the billboard's legs. */}
      <image href="/brand/logo/spark.svg" x="1006" y="272" width="16" height="16" />
      <text
        x="1014"
        y="336"
        fontFamily={MONO}
        fontWeight="700"
        fontSize="7.5"
        letterSpacing="0.6"
        textAnchor="middle"
        fill={IVORY}
      >
        BUILD DAY · HALL A
      </text>
    </g>
  );
}
