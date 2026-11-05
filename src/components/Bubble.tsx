/** Speech bubble shared by the mascots; its host positions it in CSS. */
export function Bubble({ line }: { line: string | null }) {
  return (
    <span className="bubble" data-show={line ? "" : undefined} aria-live="polite">
      {line}
    </span>
  );
}
