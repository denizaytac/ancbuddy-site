import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { MODES } from "@/data/modes";
import { useTrialDialog } from "@/hooks/useTrialDialog";

export function Hero() {
  const [mode, setMode] = useState(0);
  const [open, setOpen] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const { setOpen: openTrial } = useTrialDialog();

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => setMode((m) => (m + 1) % 3), 3200);
    return () => clearInterval(t);
  }, [autoplay]);

  const pickMode = (i: number) => {
    setAutoplay(false);
    setMode(i);
  };

  const bars = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const heights = [
        0.18 + Math.sin(i * 0.6) * 0.08,
        0.3 + Math.abs(Math.sin(i * 0.9)) * 0.6,
        0.5 + Math.abs(Math.sin(i * 0.4)) * 0.5,
      ];
      return heights[mode];
    });
  }, [mode]);

  return (
    <section className="hero container">
      <div className="hero-stack">
        <span className="pill">
          <span className="pill-dot" />
          <span>v1.2.0 · Now on macOS</span>
        </span>
        <h1>
          Bose QC Ultra control,
          <br />
          <em>without the noise.</em>
        </h1>
        <p className="hero-sub">
          A tiny menu‑bar app that switches Quiet, Aware, and Immersion modes on your Bose
          QuietComfort Ultra headphones — no Bose Music app, no clicks lost to a phone.
        </p>
        <div className="hero-cta">
          <a className="btn btn-accent" href="#pricing">
            <Icon name="bolt" size={15} />
            Get ANCBuddy — $9.99
          </a>
          <button className="btn btn-ghost" onClick={() => openTrial(true)}>
            Try free
            <Icon name="arrow" size={15} />
          </button>
        </div>
        <div className="hero-meta">
          <span>
            <Icon name="check" size={12} /> One‑time purchase
          </span>
          <span className="hero-meta-dot" />
          <span>
            <Icon name="check" size={12} /> Notarized by Apple
          </span>
          <span className="hero-meta-dot" />
          <span>
            <Icon name="check" size={12} /> macOS 13+
          </span>
        </div>
      </div>

      <div className="mac-stage">
        <div className="mac">
          <div className="menu-bar">
            <span className="menu-bar-apple">􀣺</span>
            <span className="menu-bar-app">Safari</span>
            <span className="menu-bar-items">
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>History</span>
            </span>
            <span className="menu-bar-spacer" />
            <div className="menu-bar-right">
              <Icon name="search" size={14} />
              <Icon name="wifi" size={14} />
              <Icon name="battery" size={16} />
              <button
                className={"menu-bar-icon menu-bar-logo" + (open ? " is-active" : "")}
                onClick={() => setOpen((o) => !o)}
                aria-label="ANCBuddy"
              >
                <img src="/logo.png" alt="" />
              </button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>9:41</span>
            </div>
          </div>
          <div className="desktop">
            {open && (
              <div className="dropdown">
                <div className="dd-header">
                  <div className="dd-header-row">
                    <div className="dd-device">
                      <span className="dd-device-dot" />
                      QC Ultra Headphones
                    </div>
                    <div className="dd-battery">
                      <Icon name="battery" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                      82%
                    </div>
                  </div>
                  <div className="dd-meta">LE-Atom · Connected via BLE</div>
                </div>

                <div className="dd-section-label">Noise Cancellation</div>

                {MODES.map((m, i) => (
                  <button
                    key={m.id}
                    className={"dd-mode" + (mode === i ? " is-active" : "")}
                    onClick={() => pickMode(i)}
                  >
                    <span className="dd-mode-icon">
                      <Icon name={m.icon} size={14} />
                    </span>
                    <span className="dd-mode-body">
                      <div className="dd-mode-name">{m.name}</div>
                      <div className="dd-mode-desc">{m.desc}</div>
                    </span>
                    <span className="dd-mode-shortcut">{m.shortcut}</span>
                  </button>
                ))}

                <div className="dd-divider" />

                <button className="dd-row">
                  <Icon name="keyboard" size={13} />
                  Hotkeys…
                </button>
                <button className="dd-row">
                  <Icon name="command" size={13} />
                  Preferences…
                </button>
                <button className="dd-row">
                  <Icon name="x-mark" size={13} />
                  Quit ANCBuddy
                </button>
              </div>
            )}

            <div className="wave-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--accent)" }}>{MODES[mode].name.toUpperCase()}</span>
                <span>BMAP · 0x01{mode.toString(16).padStart(2, "0")}</span>
              </div>
              <div className="wave">
                {bars.map((h, i) => (
                  <span
                    key={i + "-" + mode}
                    className="wave-bar"
                    style={
                      {
                        "--bar-h": h * 100 + "%",
                        height: h * 100 + "%",
                        animationDelay: i * 30 + "ms",
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-4)" }}>
                <span>FBlock 0x1F</span>
                <span>← BLE FEBE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
