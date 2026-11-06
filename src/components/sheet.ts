import { type PointerEvent, type RefObject, useRef } from "react";
import { type Sample, track, velocity } from "../motion";

/** Phones: dialogs become bottom sheets (app.css, "bottom sheets"). Keep in step with the CSS. */
export const PHONE = "(max-width: 760px)";

// A downward flick faster than this (px/ms) dismisses, however short.
const FLICK = 0.5;
// So does a drag past this share of the sheet's height.
const DISTANCE = 0.25;
// Dragged up, the sheet follows at this fraction: it's already fully open.
const RUBBER = 0.2;

type Drag = { y0: number; dy: number; h: number; samples: Sample[] };

/**
 * Drag-to-dismiss for a bottom sheet. Spread the handlers on the sheet's
 * handle (grip and header). While dragging the sheet follows the finger and
 * the backdrop thins (--sheet-fade); on release a flick or a long enough drag
 * dismisses, anything else springs back. Both glide on the sheet's own CSS
 * transition, from wherever the finger let go.
 */
export function useSheetDrag(sheetRef: RefObject<HTMLDialogElement | null>, dismiss: () => void) {
  const drag = useRef<Drag | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const sheet = sheetRef.current;
    if (!sheet || !e.isPrimary || e.button !== 0 || !window.matchMedia(PHONE).matches) return;
    if (e.target instanceof Element && e.target.closest("a, button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    sheet.style.transition = "none";
    sheet.toggleAttribute("data-dragging", true);
    drag.current = { y0: e.clientY, dy: 0, h: sheet.offsetHeight, samples: [{ t: e.timeStamp, x: 0, y: e.clientY }] };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    const sheet = sheetRef.current;
    if (!d || !sheet) return;
    d.dy = e.clientY - d.y0;
    const shown = d.dy < 0 ? d.dy * RUBBER : d.dy;
    sheet.style.translate = `0 ${shown}px`;
    sheet.style.setProperty("--sheet-fade", String(Math.max(0, 1 - shown / d.h)));
    track(d.samples, { t: e.timeStamp, x: 0, y: e.clientY });
  };

  const release = (e: PointerEvent<HTMLElement>, canDismiss: boolean) => {
    const d = drag.current;
    const sheet = sheetRef.current;
    drag.current = null;
    if (!d || !sheet) return;
    const v = velocity(d.samples, { t: e.timeStamp, x: 0, y: e.clientY }).y;
    // Clearing the inline styles hands the sheet back to its CSS transition,
    // which runs from the dragged spot: to closed, or back to open.
    sheet.style.removeProperty("transition");
    sheet.style.removeProperty("translate");
    sheet.style.removeProperty("--sheet-fade");
    sheet.removeAttribute("data-dragging");
    if (canDismiss && (d.dy > d.h * DISTANCE || v > FLICK)) dismiss();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: PointerEvent<HTMLElement>) => release(e, true),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => release(e, false),
    // Capture lost without an up (the window lost focus, say): spring back.
    onLostPointerCapture: (e: PointerEvent<HTMLElement>) => release(e, false),
  };
}
