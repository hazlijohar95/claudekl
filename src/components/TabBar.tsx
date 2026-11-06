import { type ReactNode, useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string; icon: ReactNode };

// Pixel icons on a 24px grid, drawn like the sound toggle's speaker.
const TABS: readonly Tab[] = [
  {
    id: "programs",
    label: "Programs",
    icon: <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />,
  },
  {
    id: "terminal",
    label: "Shell",
    icon: <path fillRule="evenodd" d="M2 4h20v16H2zM4 6v12h16V6zM6 9h2v2H6zm2 2h2v2H8zm-2 2h2v2H6zm6 1h6v2h-6z" />,
  },
  {
    id: "stickers",
    label: "Stickers",
    icon: <path fillRule="evenodd" d="M3 3h18v12h-6v6H3zM5 5v14h8v-6h6V5zm10 10h2v2h-2zm2-2h2v2h-2zm-2 4h2v2h-2z" />,
  },
  {
    id: "join",
    label: "Join",
    icon: <path fillRule="evenodd" d="M2 6h20v12H2zM4 8v8h10V8zm12 0v8h4V8zm-1 1h1v2h-1zm0 4h1v2h-1zM6 10h6v2H6zm0 3h4v1H6z" />,
  },
];

// The Events button sits in the middle slot, between the second and third tab.
const EVENTS_SLOT = 2;
const slotOf = (i: number) => (i < EVENTS_SLOT ? i : i + 1);

/**
 * Phone navigation, in the thumb zone: four section tabs around a raised
 * Events button. The ink block marks the section crossing the middle of the
 * screen and slides between tabs; none is marked over the hero.
 */
export function TabBar() {
  const [active, setActive] = useState<string | null>(null);
  // A tapped tab owns the marker until its smooth scroll ends, so the marker
  // goes straight there instead of visiting every section on the way.
  const held = useRef(false);
  const unhold = useRef<() => void>(() => {});

  useEffect(() => {
    const sections = [document.getElementById("hero"), ...TABS.map((t) => document.getElementById(t.id))].filter(
      (el): el is HTMLElement => el !== null,
    );
    const io = new IntersectionObserver(
      (entries) => {
        if (held.current) return;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          setActive(e.target.id === "hero" ? null : e.target.id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const el of sections) io.observe(el);
    return () => io.disconnect();
  }, []);

  const index = TABS.findIndex((t) => t.id === active);

  return (
    <nav className="tabbar" aria-label="Sections">
      <span
        className="tabbar-mark"
        aria-hidden="true"
        data-on={index >= 0 ? "" : undefined}
        style={{ translate: `${slotOf(Math.max(index, 0)) * 100}% 0` }}
      />
      {TABS.map((t, i) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          className="tab"
          style={{ gridColumn: slotOf(i) + 1 }}
          aria-current={t.id === active ? "location" : undefined}
          data-sound="tap"
          onClick={() => {
            unhold.current();
            held.current = true;
            setActive(t.id);
            // On scrollend, or after a timer for browsers without it and taps that don't scroll.
            const release = () => {
              held.current = false;
              window.clearTimeout(timer);
              window.removeEventListener("scrollend", release);
            };
            const timer = window.setTimeout(release, 1500);
            window.addEventListener("scrollend", release);
            unhold.current = release;
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
            {t.icon}
          </svg>
          <span>{t.label}</span>
        </a>
      ))}
      <button
        type="button"
        className="tab tab-events"
        style={{ gridColumn: EVENTS_SLOT + 1 }}
        aria-haspopup="dialog"
        aria-controls="events"
        data-open-events
        data-sound="tap"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
          <path fillRule="evenodd" d="M3 5h18v16H3zM5 10v9h14v-9zM7 2h2v5H7zm8 0h2v5h-2zm-2 11h4v4h-4z" />
        </svg>
        <span>Events</span>
      </button>
    </nav>
  );
}
