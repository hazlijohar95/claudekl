import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../motion";

const LINES = ["Claude Community", "Kuala Lumpur"] as const;
const FIRST = LINES[0].length;
const TOTAL = FIRST + LINES[1].length;

type Phase = "waiting" | "typing" | "done";

/**
 * The hero title, typed out like a terminal on first paint. `data-phase` is
 * the one signal app.css reads: the prerendered HTML says "waiting" (hidden
 * when JS is on, with a CSS failsafe), typing holds the caret solid, "done"
 * lets it blink. Without JS the full title simply shows.
 */
export function HeroTitle() {
  const [typed, setTyped] = useState(TOTAL);
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase("done");
      return;
    }
    let i = 0;
    let timer: number;
    let cancelled = false;
    setTyped(0);
    setPhase("typing");
    const step = () => {
      i += 1;
      setTyped(i);
      if (i >= TOTAL) {
        setPhase("done");
        return;
      }
      const pause = i === FIRST ? 360 : 0;
      timer = window.setTimeout(step, 42 + Math.random() * 58 + pause);
    };
    // Start once the display face is in, so letters never swap font mid-type.
    // Give up waiting after 900ms and type in whatever is loaded.
    const fontReady = document.fonts.load('300 64px "Newsreader Variable"');
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 900));
    void Promise.race([fontReady, timeout]).then(() => {
      if (!cancelled) step();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // The caret sits on the line being typed, then rests at the end.
  const caretLine = typed < FIRST ? 0 : 1;

  return (
    <h1
      id="hero-title"
      className="hero-title"
      aria-label={LINES.join(" ")}
      data-phase={phase}
    >
      {LINES.map((line, li) => {
        const shown = Math.min(Math.max(typed - (li === 0 ? 0 : FIRST), 0), line.length);
        return (
          <span key={line} className={li === 1 ? "hero-kl" : undefined} aria-hidden="true">
            {line.slice(0, shown)}
            {caretLine === li && <span className="caret" />}
            <span className="ghost">{line.slice(shown)}</span>
          </span>
        );
      })}
    </h1>
  );
}
