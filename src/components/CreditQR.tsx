import { useEffect, useRef } from "react";
import { encode, QrCodeDataType } from "uqr";
import { INK, IVORY } from "../brand";
import { credits } from "../site";
import { play } from "../sound";

// Modules of clear space around the code, the minimum the QR spec asks for.
const QUIET = 4;

/**
 * The QR as one SVG path: square modules merged into horizontal runs, the
 * finder eyes drawn as nested squares, and the Claude spark in a hole at the
 * centre. ECC Q (25% recoverable) pays for the hole; the hole is only cut
 * when it covers data modules alone, never an alignment or timing pattern.
 */
function QrSvg({ text }: { text: string }) {
  const qr = encode(text, { ecc: "Q", border: 0 });
  const n = qr.size;
  const type = (x: number, y: number) => qr.types[y]?.[x];
  const isFinder = (x: number, y: number) => type(x, y) === QrCodeDataType.Position;

  let hole = Math.round(n * 0.22);
  if (hole % 2 === 0) hole += 1;
  const h0 = (n - hole) / 2;
  const inHole = (x: number, y: number) => x >= h0 && x < h0 + hole && y >= h0 && y < h0 + hole;
  let holeIsData = true;
  for (let y = h0; y < h0 + hole; y++)
    for (let x = h0; x < h0 + hole; x++) if (type(x, y) !== QrCodeDataType.Data) holeIsData = false;
  const cut = holeIsData ? inHole : () => false;

  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      const on = (i: number) => qr.data[y]?.[i] === true && !isFinder(i, y) && !cut(i, y);
      if (!on(x)) {
        x++;
        continue;
      }
      const start = x;
      while (on(x)) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  // Finder eyes: a 7x7 ring and a 3x3 pupil, in the three corners.
  const eyes: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  for (const [x, y] of eyes) d += `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;

  const size = n + QUIET * 2;
  return (
    <svg className="credit-qr" viewBox={`${-QUIET} ${-QUIET} ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="QR code for the credits link">
      <rect x={-QUIET} y={-QUIET} width={size} height={size} fill={IVORY} />
      <path d={d} fill={INK} fillRule="evenodd" />
      {holeIsData && (
        <g>
          <rect x={h0 + 0.5} y={h0 + 0.5} width={hole - 1} height={hole - 1} fill={IVORY} stroke={INK} strokeWidth={0.5} />
          <image href="/brand/logo/spark.svg" x={h0 + 1.5} y={h0 + 1.5} width={hole - 3} height={hole - 3} />
        </g>
      )}
    </svg>
  );
}

/**
 * Full-screen credits card for the room: a big QR to scan from the projector,
 * and the three things people get wrong when claiming. Loaded only when
 * /credit runs, so the encoder stays out of the first load.
 */
export default function CreditQR({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!credits) return null;
  const close = () => {
    play("tap");
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="credit"
      aria-labelledby="credit-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="credit-panel">
        <div className="credit-top">
          <span className="events-dot" aria-hidden="true" />
          <span className="credit-event">{credits.event}</span>
          <button type="button" className="events-close" aria-label="Close credits" onClick={close} autoFocus>
            ✕
          </button>
        </div>
        <div className="credit-body">
          <a href={credits.url} target="_blank" rel="noopener" className="credit-code" aria-label="Open the credits link">
            <QrSvg text={credits.url} />
          </a>
          <div className="credit-copy">
            <h2 id="credit-title">
              {credits.amount} in Claude <em>API credits.</em>
            </h2>
            <ol className="credit-steps">
              <li>
                <span>Scan with your phone camera.</span>
              </li>
              <li>
                <span>
                  Paste your <b>organization ID</b> from console.anthropic.com. Not your Claude.ai ID: it gets rejected.
                </span>
              </li>
              <li>
                <span>One claim each. Credits land within a few minutes.</span>
              </li>
            </ol>
            <p className="credit-note">For the Claude API only, not Claude.ai.</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
