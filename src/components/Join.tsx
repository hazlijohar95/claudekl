import { INK } from "../brand";
import { channels } from "../site";
import { PlaneBodyArt } from "./landingArt";

// A barcode that looks random but never changes between renders: bar widths
// from a tiny LCG seeded with a fixed number.
const BARS = (() => {
  const out: Array<[x: number, w: number]> = [];
  let seed = 0x4b554c; // "KUL"
  let x = 0;
  while (x < 300) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    const w = 2 + (seed % 4) * 2;
    if ((seed >> 4) % 3 !== 0) out.push([x, w]);
    x += w + 2;
  }
  return out;
})();

const META = [
  ["Passenger", "You"],
  ["Flight", "CC-KL"],
  ["Gate", "Open"],
  ["Seat", "Any"],
] as const;

/**
 * Join, as a boarding pass to KUL: the ticket echoes the SFO → KUL story in
 * the hero, and the tear-off stub holds the channels. Until any channel has
 * a link, the stub carries a "Boarding soon" stamp rather than dead tiles.
 */
export function Join() {
  const anyLive = channels.some((c) => c.href);

  return (
    <section id="join" className="section join" aria-labelledby="join-title" data-reveal>
      <div className="join-head">
        <h2 id="join-title" className="join-title rv">
          Jom<span>.</span>
        </h2>
        <p className="join-sub rv">Your seat's saved.</p>
      </div>

      <article className="pass rv rv-print" aria-label="Boarding pass to Claude Community Kuala Lumpur">
        <div className="pass-main">
          <div className="pass-top">
            <img src="/brand/logo/spark.svg" alt="" width="100" height="100" />
            <span>Claude Community</span>
            <span className="pass-kind">Boarding pass</span>
          </div>

          <div className="pass-route">
            <div>
              <span className="pass-label">From</span>
              <b>YOU</b>
            </div>
            <div className="pass-flight" aria-hidden="true">
              <svg viewBox="-6 -4 150 66" shapeRendering="crispEdges">
                <PlaneBodyArt />
              </svg>
            </div>
            <div className="pass-to">
              <span className="pass-label">To</span>
              <b>KUL</b>
            </div>
          </div>

          <dl className="pass-meta">
            {META.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>

          <div className="pass-foot">
            <svg className="pass-barcode" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
              {BARS.map(([x, w]) => (
                <rect key={x} x={x} y="0" width={w} height="40" fill={INK} />
              ))}
            </svg>
            {!anyLive && (
              <span className="pass-stamp">
                Boarding
                <br />
                soon
              </span>
            )}
          </div>
        </div>

        <div className="pass-stub">
          <span className="pass-label">Check in</span>
          <ul className="pass-channels" role="list">
            {channels.map((c) => {
              const body = (
                <>
                  <span className="pass-channel">{c.label}</span>
                  <span className="pass-hint">{c.hint}</span>
                </>
              );
              return (
                <li key={c.label}>
                  {c.href ? (
                    <a href={c.href} target="_blank" rel="noreferrer" data-sound="tap">
                      {body}
                      <span className="pass-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <span className="pass-soon">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </article>
    </section>
  );
}
