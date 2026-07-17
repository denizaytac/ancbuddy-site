import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { MODES } from "@/data/modes";
import { useTrialDialog } from "@/hooks/useTrialDialog";

interface HeroScene {
  id: string;
  mode: number;
  pendingMode?: number;
  status: string;
  battery: string;
  soundBadge: string;
  soundText: string;
  soundDetail: string;
  track: string;
  autoEQ: boolean;
  levels: [number, number, number];
}

const HERO_SCENES: HeroScene[] = [
  {
    id: "aware",
    mode: 1,
    status: "Connected",
    battery: "82%",
    soundBadge: "READY",
    soundText: "Bass 0 · Mid 0 · Treble 0",
    soundDetail: "Ready for music",
    track: "",
    autoEQ: false,
    levels: [0, 0, 0],
  },
  {
    id: "analyzing",
    mode: 1,
    status: "Connected",
    battery: "82%",
    soundBadge: "UPDATING",
    soundText: "Choosing sound profile",
    soundDetail: "Current track",
    track: "The Less I Know The Better · Tame Impala",
    autoEQ: true,
    levels: [4, 1, 3],
  },
  {
    id: "switching",
    mode: 1,
    pendingMode: 2,
    status: "Connecting…",
    battery: "82%",
    soundBadge: "AI TUNED",
    soundText: "Bass +4 · Mid +1 · Treble +3",
    soundDetail: "Current track",
    track: "The Less I Know The Better · Tame Impala",
    autoEQ: true,
    levels: [4, 1, 3],
  },
];

export function Hero() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [manualMode, setManualMode] = useState<number | null>(null);
  const [open, setOpen] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const { setOpen: openTrial } = useTrialDialog();
  const scene = HERO_SCENES[sceneIndex];
  const visibleMode = scene.pendingMode ?? manualMode ?? scene.mode;

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => setSceneIndex((i) => (i + 1) % HERO_SCENES.length), 3200);
    return () => clearInterval(t);
  }, [autoplay]);

  const pickMode = (i: number) => {
    setAutoplay(false);
    setManualMode(i === 2 ? null : i);
    setSceneIndex(i === 2 ? 2 : 0);
  };

  const bars = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const band = Math.min(2, Math.floor((i / 30) * 3));
      const normalized = (scene.levels[band] + 10) / 20;
      const crown = 0.72 + 0.22 * Math.sin((i % 10) * 0.32);
      const motion = scene.id === "analyzing" ? 0.12 * Math.sin(i * 0.8) : 0;
      return Math.max(0.12, Math.min(0.92, (0.18 + normalized * 0.66) * crown + motion));
    });
  }, [scene]);

  return (
    <section className="hero container">
      <div className="hero-stack">
        <picture>
          <source
            type="image/avif"
            srcSet="/buddy-hero-160.avif 160w, /buddy-hero-320.avif 320w"
            sizes="(max-width: 600px) 112px, 132px"
          />
          <source
            type="image/webp"
            srcSet="/buddy-hero-160.webp 160w, /buddy-hero-320.webp 320w"
            sizes="(max-width: 600px) 112px, 132px"
          />
          <img
            className="hero-mascot"
            src="/buddy-hero-160.png"
            srcSet="/buddy-hero-160.png 160w, /buddy-hero-320.png 320w"
            sizes="(max-width: 600px) 112px, 132px"
            alt="ANCBuddy mascot"
            width="160"
            height="160"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <span className="pill">
          <span className="pill-dot" />
          <span>Bose QC Ultra + AI Auto-EQ</span>
        </span>
        <h1>
          Bose QC Ultra control,
          <br />
          <em>right from your Mac.</em>
        </h1>
        <p className="hero-sub">
          Switch Quiet, Aware, and Immersion without reaching for your phone. Turn on AI
          Auto-EQ when you want a track-aware sound profile with more depth.
        </p>
        <div className="hero-cta">
          {__COMMERCIAL_MODE__ === "active" ? (
            <>
              <a className="btn btn-accent" href="#pricing">
                <Icon name="bolt" size={15} />
                Buy ANCBuddy — $9.99
              </a>
              <button className="btn btn-ghost" onClick={() => openTrial(true)}>
                Try 14 days for free
                <Icon name="arrow" size={15} />
              </button>
            </>
          ) : (
            <>
              <a className="btn btn-accent" href="#features">
                Explore features
                <Icon name="arrow" size={15} />
              </a>
              <a className="btn btn-ghost" href="#devices">
                See compatibility
                <Icon name="arrow" size={15} />
              </a>
            </>
          )}
        </div>
        <div className="hero-meta">
          <span>
            <Icon name="check" size={12} /> No Bose Music app needed
          </span>
          <span className="hero-meta-dot" />
          <span>
            <Icon name="check" size={12} /> QC Ultra Headphones + Earbuds
          </span>
          <span className="hero-meta-dot" />
          <span>
            <Icon name="check" size={12} />
            {__COMMERCIAL_MODE__ === "active" ? "Buy once, no subscription" : "macOS 12 and newer"}
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
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/logo-40.avif 40w, /logo-80.avif 80w"
                    sizes="40px"
                  />
                  <source
                    type="image/webp"
                    srcSet="/logo-40.webp 40w, /logo-80.webp 80w"
                    sizes="40px"
                  />
                  <img
                    src="/logo-40.png"
                    srcSet="/logo-40.png 40w, /logo-80.png 80w"
                    sizes="40px"
                    alt="ANCBuddy menu-bar icon"
                    width="40"
                    height="40"
                    decoding="async"
                  />
                </picture>
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
                      QC Ultra Headphones
                    </div>
                    <div className="dd-battery">
                      <Icon name="battery" size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                      {scene.battery}
                    </div>
                  </div>
                  <div className="dd-status-line">
                    <span>{scene.status}</span>
                    {scene.status.includes("Connecting") && <span className="mini-spinner" />}
                  </div>
                </div>

                <div className="dd-section-label">Listening Mode</div>

                {MODES.map((m, i) => (
                  <button
                    key={m.id}
                    className={
                      "dd-mode" +
                      (visibleMode === i ? " is-active" : "") +
                      (scene.pendingMode === i ? " is-pending" : "")
                    }
                    onClick={() => pickMode(i)}
                  >
                    <span className="dd-mode-icon">
                      <Icon name={m.icon} size={14} />
                    </span>
                    <span className="dd-mode-body">
                      <div className="dd-mode-name">{m.name}</div>
                      <div className="dd-mode-desc">{m.desc}</div>
                    </span>
                    {scene.pendingMode === i && <span className="mini-spinner light" />}
                  </button>
                ))}

                <div className="dd-divider" />

                <div className="dd-section-label">Sound</div>
                <button className="dd-toggle-row" onClick={() => setSceneIndex(1)}>
                  <span className="dd-toggle-icon">
                    <Icon name="bolt" size={13} />
                  </span>
                  <span>
                    <span className="dd-toggle-title">AI Auto-EQ</span>
                    <span className="dd-toggle-detail">{scene.autoEQ ? "On" : "Off"}</span>
                  </span>
                  <span className={"mock-switch" + (scene.autoEQ ? " is-on" : "")} />
                </button>
                <div className="dd-sound-card">
                  <div className="dd-sound-top">
                    <span>{scene.soundBadge}</span>
                    <span>Sound Profile</span>
                  </div>
                  <div className="dd-wave">
                    {bars.map((h, i) => (
                      <span
                        key={i + "-" + scene.id}
                        className="wave-bar"
                        style={
                          {
                            "--bar-h": h * 100 + "%",
                            height: h * 100 + "%",
                            animationDelay: i * 28 + "ms",
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                  <div className="dd-sound-values">{scene.soundText}</div>
                  {scene.track && (
                    <div className="dd-track">
                      <span>{scene.soundDetail}</span>
                      <strong>{scene.track}</strong>
                    </div>
                  )}
                </div>

                <div className="dd-divider" />
                <div className="dd-section-label">General</div>
                <button className="dd-toggle-row">
                  <span className="dd-toggle-icon">
                    <Icon name="arrow" size={13} />
                  </span>
                  <span>
                    <span className="dd-toggle-title">Launch at Login</span>
                    <span className="dd-toggle-detail">On</span>
                  </span>
                  <span className="mock-switch is-on" />
                </button>
                <button className="dd-row">
                  <Icon name="arrow" size={13} />
                  Check for Updates…
                </button>
                <button className="dd-row">
                  <Icon name="x-mark" size={13} />
                  Quit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
