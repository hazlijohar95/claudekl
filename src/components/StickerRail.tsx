import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { useNear } from "../motion";
import { plateSrcSet, siteName, stickers } from "../site";
import { play } from "../sound";
import { PHONE, useSheetDrag } from "./sheet";

// How long a press must last to arm a save. Matches the fill in app.css.
const HOLD_MS = 500;
// A finger that wanders this far is swiping the rail, not holding.
const SLOP = 10;
// The same tilts as the desktop board's opening layout.
const TILT = [-6, 5, -3, 7, -8, 4] as const;

function save(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = "";
  a.click();
}

type Hold = { x: number; y: number; timer: number; armed: boolean };

/**
 * Phones: the stickers as a swipeable sheet of stickers. Tap one for a
 * preview in a bottom sheet with its download. Press and hold to save it
 * straight away: a bar fills while you hold, and letting go saves.
 */
export function StickerRail() {
  const [holding, setHolding] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [open, setOpen] = useState(0);
  const hold = useRef<Hold | null>(null);
  // Set when a hold ends in a save, so the click that follows doesn't also open the preview.
  const skipClick = useRef(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const savedTimer = useRef(0);
  const railRef = useRef<HTMLUListElement>(null);
  const near = useNear(railRef);

  const close = () => {
    play("tap");
    sheetRef.current?.close();
  };
  const drag = useSheetDrag(sheetRef, close);

  // The preview is only styled as a sheet on phones; turning a phone to a
  // wider landscape closes it rather than leave a bare dialog.
  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    const onChange = () => {
      if (!phone.matches) sheetRef.current?.close();
    };
    phone.addEventListener("change", onChange);
    return () => {
      phone.removeEventListener("change", onChange);
      window.clearTimeout(savedTimer.current);
      if (hold.current) window.clearTimeout(hold.current.timer);
    };
  }, []);

  const endHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
    setHolding(null);
  };

  const onDown = (i: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    endHold();
    skipClick.current = false;
    const timer = window.setTimeout(() => {
      if (!hold.current) return;
      hold.current.armed = true;
      navigator.vibrate?.(12);
    }, HOLD_MS);
    hold.current = { x: e.clientX, y: e.clientY, timer, armed: false };
    setHolding(i);
  };

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const h = hold.current;
    if (h && !h.armed && Math.hypot(e.clientX - h.x, e.clientY - h.y) > SLOP) endHold();
  };

  // The save happens on release, not when the hold completes: a touch
  // pointerup counts as a user gesture, so browsers treat the download as
  // asked for instead of blocking or prompting for it.
  const onUp = (i: number) => () => {
    const armed = hold.current?.armed ?? false;
    endHold();
    const s = stickers[i];
    if (!armed || !s) return;
    skipClick.current = true;
    save(s.download);
    play("drop");
    window.clearTimeout(savedTimer.current);
    setSaved(i);
    savedTimer.current = window.setTimeout(() => setSaved(null), 1400);
  };

  const onClick = (i: number, e: MouseEvent) => {
    // A keyboard click (detail 0) never follows a hold.
    const skip = skipClick.current && e.detail !== 0;
    skipClick.current = false;
    if (skip) return;
    play("pick");
    setOpen(i);
    sheetRef.current?.showModal();
  };

  const shown = stickers[open];

  return (
    <div className="sticker-rail-wrap">
      <ul className="sticker-rail" role="list" ref={railRef}>
        {stickers.map((s, i) => (
          <li key={s.name} className="rv rv-deal" style={{ rotate: `${TILT[i % TILT.length]}deg` }}>
            <button
              type="button"
              className="rail-sticker"
              aria-haspopup="dialog"
              aria-label={`${s.name} sticker`}
              data-holding={holding === i ? "" : undefined}
              data-saved={saved === i ? "" : undefined}
              onPointerDown={onDown(i)}
              onPointerMove={onMove}
              onPointerUp={onUp(i)}
              onPointerCancel={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => onClick(i, e)}
            >
              {near && (
                <img
                  src={s.src}
                  srcSet={plateSrcSet(s.src)}
                  sizes="(max-width: 532px) 44vw, 220px"
                  alt=""
                  draggable={false}
                  width="1080"
                  height="1080"
                  decoding="async"
                />
              )}
              <span className="rail-stamp" aria-hidden="true">
                Saved ↓
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {saved !== null ? `${stickers[saved]?.name} sticker saved.` : ""}
      </p>

      <dialog
        ref={sheetRef}
        className="sheet sticker-sheet"
        aria-labelledby="sticker-sheet-title"
        onCancel={() => play("tap")}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="sheet-panel">
          <div className="sheet-handle" {...drag}>
            <span className="sheet-grip" aria-hidden="true" />
            <div className="sheet-top">
              <h2 id="sticker-sheet-title">{shown?.name}</h2>
              <button type="button" className="events-close" aria-label="Close preview" onClick={close} autoFocus>
                ✕
              </button>
            </div>
          </div>
          {shown && (
            <>
              <img
                key={shown.name}
                className="sheet-sticker"
                src={shown.src}
                srcSet={plateSrcSet(shown.src)}
                sizes="90vw"
                alt={`${siteName} — ${shown.name}`}
                width="1080"
                height="1080"
                // Lazy in a closed dialog: fetched on first open, and not preloaded with the page.
                loading="lazy"
                decoding="async"
              />
              <a href={shown.download} download className="btn btn-ink sheet-cta" data-sound="tap">
                Download PNG <span aria-hidden="true">↓</span>
              </a>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
