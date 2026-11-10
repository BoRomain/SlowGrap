import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const DEFAULTS = {
  enabled: true,
  speed: 1,
  preservePitch: false,
  reverb: 0,
  room: "hall",
  bass: 0,
  treble: 0,
};

const SPEED_MIN = 0.5;
const SPEED_MAX = 1.2;

const PRESETS = [
  { label: "Original", speed: 1, reverb: 0 },
  { label: "Slowed", speed: 0.85, reverb: 0 },
  { label: "Slowed + Reverb", speed: 0.85, reverb: 0.35, room: "hall" },
  { label: "Daycore", speed: 0.75, reverb: 0.2, room: "chambre" },
  { label: "Nightcore", speed: 1.2, reverb: 0 },
];

const ROOMS = [
  { id: "chambre", label: "Chambre" },
  { id: "hall", label: "Hall" },
  { id: "cathedrale", label: "Cathédrale" },
];

const CSS = `
@font-face {
  font-family: "Inter";
  src: url("inter.woff2") format("woff2");
  font-weight: 100 900;
  font-display: block;
}
@font-face {
  font-family: "Manrope";
  src: url("manrope.woff2") format("woff2");
  font-weight: 200 800;
  font-display: block;
}
:root {
  --bg: #0b0b0f;
  --card: #16161b;
  --border: rgba(255,255,255,0.08);
  --track: #0f0f13;
  --accent: #8b7cff;
  --fill: rgba(139,124,255,0.28);
  --text: #ececf1;
  --muted: #9a9aa6;
}
* { box-sizing: border-box; margin: 0; }
html, body { background: var(--bg); }
body {
  color: var(--text);
  font: 500 14px/1.3 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}
button { font: inherit; color: inherit; cursor: pointer; }
.app { width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }

.header { display: flex; align-items: center; gap: 12px; }
.logo {
  width: 40px; height: 40px; border-radius: 10px; background: var(--accent);
  display: grid; place-items: center; color: #111; flex: none;
}
.title { flex: 1; min-width: 0; }
.title h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.title p { color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn {
  width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center;
  background: var(--card); border: 1px solid var(--border); transition: background .15s;
}
.icon-btn:hover { background: #1e1e25; }
.icon-btn.power { color: var(--muted); }
.icon-btn.power.on { background: var(--accent); border-color: var(--accent); color: #111; }

.controls { display: flex; flex-direction: column; gap: 14px; transition: opacity .2s; }
.controls.off { opacity: 0.4; pointer-events: none; }

.fs {
  position: relative; overflow: hidden; background: var(--track);
  border-radius: 14px; cursor: ew-resize; touch-action: none; outline: none;
}
.fs:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.fs-fill { position: absolute; top: 0; bottom: 0; background: var(--fill); }
.fs-edge { position: absolute; top: 0; bottom: 0; width: 3px; margin-left: -1.5px; background: var(--accent); }
.fs-marker { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.12); }
.fs-content {
  position: relative; height: 100%; display: flex; align-items: center;
  justify-content: space-between; padding: 0 14px; pointer-events: none;
}

.speed { height: 102px; border-radius: 20px; border: 1px solid var(--border); background: var(--card); }
.speed .fs-content { justify-content: flex-start; gap: 20px; padding: 0 16px; }
.knob {
  width: 64px; height: 64px; border-radius: 50%; background: #141418; flex: none;
  display: grid; place-items: center; position: relative;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
}
.knob::before, .knob::after {
  content: ""; position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.08);
}
.knob::before { inset: 9px; }
.knob::after { inset: 14px; }
.knob-dot { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px #0b0b0f; z-index: 1; }
.knob-ind { position: absolute; inset: 0; }
.knob-ind::before {
  content: ""; position: absolute; left: 50%; top: 6px; width: 3px; height: 12px;
  margin-left: -1.5px; border-radius: 2px; background: #3a3a44;
}
.speed-label { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.12em; }
.speed-value { font-family: Manrope, Inter, sans-serif; font-size: 38px; font-weight: 800; letter-spacing: -0.05em; line-height: 1; font-variant-numeric: tabular-nums; }
.speed-value span { font-size: 14px; color: var(--muted); margin-left: 1px; }
.speed-sub { color: var(--muted); font-size: 12px; margin-top: 2px; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  height: 32px; padding: 0 13px; border-radius: 16px; background: var(--card);
  border: 1px solid var(--border); font-size: 13px; transition: border-color .15s, background .15s;
}
.chip:hover { background: #1e1e25; }
.chip.active { border-color: var(--accent); background: rgba(139,124,255,0.14); }

.card {
  background: var(--card); border: 1px solid var(--border); border-radius: 20px;
  padding: 12px 12px; display: flex; flex-direction: column; gap: 8px;
}
.row { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px; }
.card-title { font-size: 14px; font-weight: 600; }

.toggle {
  width: 44px; height: 26px; border-radius: 13px; border: none; padding: 0;
  background: #2a2a33; position: relative; transition: background .15s;
}
.toggle::after {
  content: ""; position: absolute; top: 4px; left: 4px; width: 18px; height: 18px;
  border-radius: 50%; background: #ececf1; transition: transform .15s;
}
.toggle.on { background: var(--accent); }
.toggle.on::after { transform: translateX(18px); }

.reverb { height: 48px; }
.fs-label { font-size: 14px; }
.fs-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }

.segmented {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
  background: var(--track); border-radius: 12px; padding: 3px;
}
.segmented button {
  height: 30px; border: none; border-radius: 9px; background: transparent;
  color: var(--muted); font-size: 13px; transition: background .15s, color .15s;
}
.segmented button.active { background: #2b2938; color: var(--text); font-weight: 700; }

.eq { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.eq .fs { height: 48px; }
.eq .fs-value { font-weight: 500; color: var(--muted); }
`;

// Per-tab: settings are pushed to the active tab's content script, not stored globally.
const tabP =
  chrome.tabs?.query({ active: true, currentWindow: true }).then((t) => t[0]) ??
  Promise.resolve(); // ?. so the page also renders outside the extension

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const near = (a, b) => Math.abs(a - b) < 0.005;
const fmtDb = (v) => (v > 0 ? "+" : "") + v + " dB";

function hostname(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h || "page locale";
  } catch {
    return "aucun onglet";
  }
}

// Horizontal "filled card" slider: drag anywhere / click / arrow keys.
function FillSlider({ min, max, step, value, onChange, origin = "left", marker, className = "", label, children }) {
  const ref = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = (String(step).split(".")[1] || "").length;

  const fromX = (clientX) => {
    const r = ref.current.getBoundingClientRect();
    const raw = min + clamp((clientX - r.left) / r.width, 0, 1) * (max - min);
    return +(Math.round(raw / step) * step).toFixed(decimals);
  };
  const emit = (v) => v !== value && onChange(v);

  const onPointerDown = (e) => {
    ref.current.setPointerCapture(e.pointerId);
    emit(fromX(e.clientX));
  };
  const onPointerMove = (e) => {
    if (ref.current.hasPointerCapture(e.pointerId)) emit(fromX(e.clientX));
  };
  const onKeyDown = (e) => {
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (!d) return;
    e.preventDefault();
    emit(+clamp(value + d * step, min, max).toFixed(decimals));
  };

  const lo = origin === "center" ? Math.min(50, pct) : 0;
  const hi = origin === "center" ? Math.max(50, pct) : pct;

  return (
    <div
      ref={ref}
      className={"fs " + className}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      <div className="fs-fill" style={{ left: lo + "%", width: hi - lo + "%" }} />
      {marker != null && (
        <div className="fs-marker" style={{ left: ((marker - min) / (max - min)) * 100 + "%" }} />
      )}
      {origin === "center" && <div className="fs-marker" style={{ left: "50%" }} />}
      <div className="fs-edge" style={{ left: pct + "%" }} />
      <div className="fs-content">{children}</div>
    </div>
  );
}

const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13c1.5 0 1.5-5 3-5s1.5 9 3 9 1.5-13 3-13 1.5 13 3 13 1.5-7 3-7 1.5 3 3 3" />
  </svg>
);
const ResetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
const PowerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v9" />
    <path d="M6.4 6.4a8 8 0 1 0 11.2 0" />
  </svg>
);

function App() {
  const [s, setS] = useState(DEFAULTS);
  const [host, setHost] = useState("");

  useEffect(() => {
    tabP
      .then((tab) => {
        setHost(hostname(tab?.url));
        return chrome.tabs.sendMessage(tab.id, { type: "get" }, { frameId: 0 });
      })
      .then((r) => setS({ ...DEFAULTS, ...r }))
      .catch(() => {});
  }, []);

  const save = async (next) => {
    setS(next);
    const tab = await tabP;
    if (tab) chrome.tabs.sendMessage(tab.id, { type: "set", settings: next }).catch(() => {});
  };
  const set = (patch) => save({ ...s, ...patch });

  const semitones = 12 * Math.log2(s.speed);
  const knobAngle = ((s.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 270 - 135;
  const isActive = (p) =>
    near(s.speed, p.speed) && near(s.reverb, p.reverb) && (!p.room || s.room === p.room);

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="header">
        <div className="logo"><Logo /></div>
        <div className="title">
          <h1>SlowGrap</h1>
          <p>{host || "…"} · onglet actif</p>
        </div>
        <button className="icon-btn" title="Réinitialiser" onClick={() => save({ ...DEFAULTS })}>
          <ResetIcon />
        </button>
        <button
          className={"icon-btn power" + (s.enabled ? " on" : "")}
          title={s.enabled ? "Désactiver" : "Activer"}
          onClick={() => set({ enabled: !s.enabled })}
        >
          <PowerIcon />
        </button>
      </header>

      <div className={"controls" + (s.enabled ? "" : " off")}>
        <FillSlider
          className="speed"
          label="Vitesse"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={0.01}
          marker={1}
          value={s.speed}
          onChange={(speed) => set({ speed })}
        >
          <div className="knob">
            <div className="knob-ind" style={{ transform: `rotate(${knobAngle}deg)` }} />
            <div className="knob-dot" />
          </div>
          <div>
            <div className="speed-label">VITESSE</div>
            <div className="speed-value">
              {s.speed.toFixed(2)}
              <span>×</span>
            </div>
            <div className="speed-sub">
              {s.preservePitch
                ? "tonalité conservée"
                : (semitones > 0.05 ? "+" : semitones < -0.05 ? "−" : "") +
                  Math.abs(semitones).toFixed(1) +
                  " demi-tons"}
            </div>
          </div>
        </FillSlider>

        <div className="chips">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={"chip" + (isActive(p) ? " active" : "")}
              onClick={() =>
                set({
                  speed: p.speed,
                  reverb: p.reverb,
                  preservePitch: false,
                  ...(p.room && { room: p.room }),
                })
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <section className="card">
          <div className="row">
            <span className="card-title">Conserver la tonalité</span>
            <button
              className={"toggle" + (s.preservePitch ? " on" : "")}
              role="switch"
              aria-checked={s.preservePitch}
              aria-label="Conserver la tonalité"
              onClick={() => set({ preservePitch: !s.preservePitch })}
            />
          </div>
          <FillSlider
            className="reverb"
            label="Reverb"
            min={0}
            max={1}
            step={0.01}
            value={s.reverb}
            onChange={(reverb) => set({ reverb })}
          >
            <span className="fs-label">Reverb</span>
            <span className="fs-value">{Math.round(s.reverb * 100)}%</span>
          </FillSlider>
          <div className="segmented" role="radiogroup" aria-label="Type de salle">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={s.room === r.id}
                className={s.room === r.id ? "active" : ""}
                onClick={() => set({ room: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="row">
            <span className="card-title">Égaliseur</span>
          </div>
          <div className="eq">
            {[
              ["bass", "Basses"],
              ["treble", "Aigus"],
            ].map(([key, label]) => (
              <FillSlider
                key={key}
                label={label}
                origin="center"
                min={-12}
                max={12}
                step={1}
                value={s[key]}
                onChange={(v) => set({ [key]: v })}
              >
                <span className="fs-label">{label}</span>
                <span className="fs-value">{fmtDb(s[key])}</span>
              </FillSlider>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
