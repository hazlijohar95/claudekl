import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { channels, coords, programs } from "../site";
import { play } from "../sound";

type Entry = { id: number; input?: string; output: ReactNode };

const SUGGESTIONS = ["/programs", "/join", "/where", "/landing", "/clawd", "/kancil", "/clear"] as const;

const KANCIL_ASCII = String.raw`
      (\ /)
     ( o.o)  ~ jom!
   __/ >  \___
  (___________)
    ||     ||`;

type Hooks = { onKancil: () => void; onClawd: () => void; onLanding: () => void };

function run(raw: string, { onKancil, onClawd, onLanding }: Hooks): ReactNode | "clear" {
  const cmd = raw.trim().toLowerCase().replace(/^\//, "");
  switch (cmd) {
    case "":
      return null;
    case "help":
      return (
        <div className="term-grid">
          {SUGGESTIONS.map((s) => (
            <span key={s}>{s}</span>
          ))}
          <span>/help</span>
        </div>
      );
    case "programs":
      return programs.map((p, i) => (
        <div key={p.slug}>
          <span className="t-clay">0{i + 1}</span> {p.name.padEnd(15, " ")}
          <span className="t-dim">{p.tagline}</span>
        </div>
      ));
    case "join": {
      const live = channels.filter((c) => c.href);
      if (live.length === 0) return <span className="t-dim">Links drop soon. Watch this space.</span>;
      return live.map((c) => (
        <div key={c.label}>
          → <a href={c.href ?? undefined}>{c.label}</a> <span className="t-dim">{c.hint}</span>
        </div>
      ));
    }
    case "where":
      return (
        <>
          <div>Kuala Lumpur, Malaysia</div>
          <div className="t-dim">{coords} · UTC+8 · venue rotates</div>
        </>
      );
    case "landing":
      onLanding();
      return (
        <span>
          <span className="t-clay">✈ SFO → KUL</span> Clawd inbound. <span className="t-dim">Scroll up ↑</span>
        </span>
      );
    case "clawd":
      onClawd();
      return <span className="t-clay">✻ Clawd does a flip.</span>;
    case "kancil":
      onKancil();
      return <pre className="t-clay">{KANCIL_ASCII}</pre>;
    case "teh-tarik":
    case "teh tarik":
      return <span>☕ Kurang manis, satu. Brewing…</span>;
    case "clear":
      return "clear";
    case "sudo":
    case "sudo rm -rf /":
      return <span className="t-clay">Nice try.</span>;
    default:
      return (
        <span>
          <span className="t-dim">Unknown command:</span> {raw.trim()} <span className="t-dim">· try /help</span>
        </span>
      );
  }
}

const CLAWD_ASCII = [" ▐▛███▜▌ ", "▝▜█████▛▘", "  ▘▘ ▝▝  "];

const WELCOME: Entry = {
  id: 0,
  output: (
    <div className="term-welcome">
      <pre className="t-clay" aria-hidden="true">
        {CLAWD_ASCII.join("\n")}
      </pre>
      <div>
        <b>Claude Code KL</b>
        <div className="t-dim">Claude Community · Kuala Lumpur</div>
        <div className="t-dim">/help for commands</div>
      </div>
    </div>
  ),
};

export function Terminal(hooks: Hooks) {
  const [entries, setEntries] = useState<Entry[]>([WELCOME]);
  const [value, setValue] = useState("");
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const submit = (raw: string) => {
    play("enter");
    const output = run(raw, hooks);
    if (output === "clear") {
      setEntries([]);
    } else {
      setEntries((prev) => [...prev, { id: nextId.current++, input: raw, output }]);
    }
    setValue("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  return (
    <div className="term">
      <div className="term-bar">
        <span className="term-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>claude — kuala-lumpur</span>
      </div>
      <div className="term-body" ref={scrollRef} onClick={() => inputRef.current?.focus()} aria-live="polite">
        {entries.map((e) => (
          <div key={e.id} className="term-entry">
            {e.input !== undefined && (
              <div>
                <span className="t-clay">&gt;</span> {e.input}
              </div>
            )}
            {e.output && <div className="term-out">{e.output}</div>}
          </div>
        ))}
        <form onSubmit={onSubmit} className="term-input">
          <span className="t-clay" aria-hidden="true">
            &gt;
          </span>
          <label htmlFor="term-cmd" className="sr-only">
            Terminal command
          </label>
          <input
            id="term-cmd"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key.length === 1 || e.key === "Backspace") play("key", { jitter: { detune: 250, volume: 0.3 } });
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="type /help"
          />
        </form>
      </div>
      <div className="term-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => submit(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
