/** Speech bubble shared by the mascots; its host positions it in CSS. */
export function Bubble({ line }: { line: string | null }) {
  return (
    <span className="bubble" data-show={line ? "" : undefined} aria-hidden="true">
      {line}
    </span>
  );
}

/**
 * Reads `text` out to screen readers when it changes. Hosts render it next
 * to their button, not inside it: a button's contents aren't exposed to
 * assistive tech, so a live region in there may never be announced.
 */
export function Announce({ text }: { text: string | null }) {
  return (
    <span className="sr-only" aria-live="polite">
      {text}
    </span>
  );
}
