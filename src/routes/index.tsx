import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClaudeFM } from "../components/ClaudeFM";
import { Clawd } from "../components/Clawd";
import { ClawdLanding } from "../components/ClawdLanding";
import { Clock } from "../components/Clock";
import { Events } from "../components/Events";
import { HeroTitle } from "../components/HeroTitle";
import { Join } from "../components/Join";
import { Kancil } from "../components/Kancil";
import { Programs } from "../components/Programs";
import { Skyline } from "../components/Skyline";
import { SoundToggle } from "../components/SoundToggle";
import { Stickers } from "../components/Stickers";
import { Terminal } from "../components/Terminal";
import { siteName, siteUrl } from "../site";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [poke, setPoke] = useState(0);
  const [clawdDance, setClawdDance] = useState(0);
  const [landing, setLanding] = useState(0);

  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="bar">
        <a href="/" className="logo" aria-label={`${siteName} home`}>
          <img src="/brand/logo/lockup.svg" alt="" width="640" height="120" />
        </a>
        <nav aria-label="Sections">
          <a href="#programs" data-sound="tap">
            Programs
          </a>
          <a href="#terminal" data-sound="tap">
            Terminal
          </a>
          <a href="#stickers" data-sound="tap">
            Stickers
          </a>
        </nav>
        <Clock />
        <Events />
      </header>

      <main id="main">
        <div className="fold">
          <section id="hero" className="hero" aria-labelledby="hero-title">
            <div className="hero-meta">
              <ClaudeFM />
            </div>
            <div className="hero-head">
              <HeroTitle />
            </div>
            <div className="hero-scene">
              <div className="sky">
                <Skyline className="skyline" />
                <ClawdLanding replay={landing} />
              </div>
            </div>
          </section>
        </div>

        <section id="programs" className="section" aria-labelledby="programs-title">
          <div className="section-head">
            <h2 id="programs-title">
              Four ways <em>in.</em>
            </h2>
            <span className="hint">Tap a card ↻</span>
          </div>
          <Programs />
        </section>

        <section id="terminal" className="section section-ink" aria-labelledby="terminal-title">
          <div className="section-head">
            <h2 id="terminal-title">
              Say <em>hi</em>, in shell.
            </h2>
            <span className="hint">Try /clawd</span>
          </div>
          <div className="term-stage">
            <Clawd className="clawd-track-term" dance={clawdDance} />
            <Terminal
              onKancil={() => setPoke((p) => p + 1)}
              onClawd={() => setClawdDance((p) => p + 1)}
              onLanding={() => setLanding((p) => p + 1)}
            />
          </div>
        </section>

        <section id="stickers" className="section section-clay" aria-labelledby="stickers-title">
          <div className="section-head">
            <h2 id="stickers-title">
              Stickers. <em>Drag 'em.</em>
            </h2>
            <span className="hint">↓ to download</span>
          </div>
          <Stickers />
        </section>

        <Join />
      </main>

      <footer className="foot">
        <img src="/brand/logo/lockup-ivory.svg" alt={siteName} width="640" height="120" className="foot-logo" />
        <span>{new URL(siteUrl).host}</span>
        <span>A Claude Community chapter · Kuala Lumpur, MY</span>
        <span>Claude is a trademark of Anthropic.</span>
        <SoundToggle />
      </footer>

      <Peek poke={poke} />
    </>
  );
}

/**
 * Corner kancil, shown between the hero and the Join section so it never
 * covers the hero mascot, the Join tiles or the footer. Its own state, so
 * scrolling past those thresholds re-renders only this.
 */
function Peek({ poke }: { poke: number }) {
  const [heroGone, setHeroGone] = useState(false);
  const [joinNear, setJoinNear] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const join = document.getElementById("join");
    if (!hero || !join) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) setHeroGone(!e.isIntersecting);
          else setJoinNear(e.isIntersecting);
        }
      },
      { threshold: 0.05 },
    );
    io.observe(hero);
    io.observe(join);
    return () => io.disconnect();
  }, []);

  return (
    <div className="peek" data-show={heroGone && !joinNear ? "" : undefined}>
      <Kancil poke={poke} />
    </div>
  );
}
