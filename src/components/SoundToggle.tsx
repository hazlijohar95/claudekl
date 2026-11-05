import { setSoundOn, useSoundOn } from "../sound";

/** Header switch for all site sound. Pixel speaker, waves when on. */
export function SoundToggle() {
  const on = useSoundOn();
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={on}
      aria-label={on ? "Sound on. Mute site sounds." : "Sound off. Turn site sounds on."}
      onClick={() => setSoundOn(!on)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
        {/* Both stay mounted; app.css cross-fades them on aria-pressed. */}
        <g className="sound-waves" fill="currentColor">
          <rect x="14" y="10" width="2" height="4" />
          <rect x="17" y="8" width="2" height="8" />
          <rect x="20" y="6" width="2" height="12" />
        </g>
        <g className="sound-muted" fill="currentColor">
          <rect x="15" y="9" width="2" height="2" />
          <rect x="17" y="11" width="2" height="2" />
          <rect x="19" y="13" width="2" height="2" />
          <rect x="19" y="9" width="2" height="2" />
          <rect x="15" y="13" width="2" height="2" />
        </g>
      </svg>
      <span className="sound-label">{on ? "On" : "Off"}</span>
    </button>
  );
}
