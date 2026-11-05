import { useState } from "react";
import { plateSrcSet, programs } from "../site";
import { play } from "../sound";

export function Programs() {
  const [flipped, setFlipped] = useState<string | null>(null);

  return (
    <ul className="programs" role="list">
      {programs.map((p, i) => {
        const isFlipped = flipped === p.slug;
        return (
          <li key={p.slug}>
            <button
              type="button"
              className="program"
              aria-pressed={isFlipped}
              aria-label={`${p.name}: ${p.tagline}`}
              onClick={() => {
                play("flip", { jitter: { detune: 60 } });
                setFlipped(isFlipped ? null : p.slug);
              }}
            >
              <span className="program-inner">
                <span className="program-face program-front">
                  <span className="program-num">0{i + 1}</span>
                  <span className="program-flip" aria-hidden="true">
                    ↻
                  </span>
                  <img src={p.icon} alt="" className="program-icon" width="300" height="290" loading="lazy" />
                  <span className="program-name">{p.name}</span>
                  <span className="program-tag">{p.tagline}</span>
                </span>
                <span className="program-face program-back">
                  <img
                    src={p.card}
                    srcSet={plateSrcSet(p.card)}
                    sizes="(min-width: 1120px) 25vw, (min-width: 560px) 50vw, 100vw"
                    alt=""
                    width="1080"
                    height="1080"
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
