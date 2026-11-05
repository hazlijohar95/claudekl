import { useEffect, useEffectEvent, useRef, useState } from "react";
import { luma } from "../site";
import { play } from "../sound";

/**
 * Header "Events" button. Opens the Luma calendar in a panel under the bar,
 * so people browse and RSVP without leaving the page. The iframe mounts on
 * first open and then stays, so reopening is instant. Any button carrying
 * `data-open-events` opens it, this one included.
 */
export function Events() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  const open = () => {
    setMounted(true);
    dialogRef.current?.showModal();
  };
  const close = () => {
    play("tap");
    dialogRef.current?.close();
  };

  const onDocumentClick = useEffectEvent((e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest("[data-open-events]")) open();
  });
  useEffect(() => {
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  return (
    <>
      <button
        type="button"
        className="btn btn-ink btn-sm"
        aria-haspopup="dialog"
        aria-controls="events"
        data-open-events
        data-sound="tap"
      >
        Events
      </button>
      <dialog
        ref={dialogRef}
        id="events"
        className="events"
        aria-labelledby="events-title"
        onCancel={() => play("tap")}
        // A click that lands on the dialog itself, not its panel, is the backdrop.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="events-panel">
          <div className="events-top">
            <span className="events-dot" aria-hidden="true" />
            <h2 id="events-title" className="events-title">
              Upcoming events
            </h2>
            <a href={luma.url} target="_blank" rel="noreferrer" data-sound="tap">
              Luma ↗
            </a>
            {/* Focus starts here, not in the iframe, so Esc reaches the dialog. */}
            <button type="button" className="events-close" aria-label="Close events" onClick={close} autoFocus>
              ✕
            </button>
          </div>
          <div className="events-frame">
            <p className="events-loading" aria-hidden="true">
              Loading events…
            </p>
            {mounted && <iframe src={luma.embed} title="Claude Community events on Luma" allowFullScreen />}
          </div>
        </div>
      </dialog>
    </>
  );
}
