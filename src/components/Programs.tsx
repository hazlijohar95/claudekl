import { useRef, useState } from "react";
import { plateSrcSet, programs } from "../site";
import { play } from "../sound";

export function Programs() {
  const [flipped, setFlipped] = useState<string | null>(null);
  // Phones show the cards as a swipe carousel (app.css); this is the card in front.
  const [current, setCurrent] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const onScroll = () => {
    const list = listRef.current;
    const [a, b] = list?.children ?? [];
    if (!list || !(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
    // The last card can't snap to the start edge, so the scroll's end means it.
    const atEnd = list.scrollLeft >= list.scrollWidth - list.clientWidth - 2;
    const i = atEnd ? programs.length - 1 : Math.round(list.scrollLeft / (b.offsetLeft - a.offsetLeft));
    setCurrent(i);
  };

  return (
    <>
      <ul className="programs" role="list" ref={listRef} onScroll={onScroll}>
        {programs.map((p, i) => {
          const isFlipped = flipped === p.slug;
          return (
            <li key={p.slug} className="rv rv-deal">
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
                      sizes="(min-width: 1120px) 25vw, (min-width: 761px) 50vw, (max-width: 460px) 78vw, 360px"
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
      {/* Position in the carousel. The cards themselves are the controls. */}
      <div className="carousel-dots rv" aria-hidden="true">
        {programs.map((p, i) => (
          <i key={p.slug} data-on={i === current ? "" : undefined} />
        ))}
        <span>
          0{current + 1} / 0{programs.length}
        </span>
      </div>
    </>
  );
}
