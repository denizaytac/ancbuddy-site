import { useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { Eyebrow, SectionTitle, SectionLede } from "./Section";

interface FeatureProps {
  span: 4 | 6 | 8 | 12;
  icon: IconName;
  title: string;
  body: string;
  children?: ReactNode;
}

function Feature({ span, icon, title, body, children }: FeatureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
  };
  return (
    <div className={`feature reveal f-span-${span}`} ref={ref} onMouseMove={onMove}>
      <div className="feature-glow" />
      <div className="feature-icon">
        <Icon name={icon} size={18} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children && <div className="f-visual">{children}</div>}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="section container">
      <Eyebrow>Features</Eyebrow>
      <SectionTitle>
        Built like the rest of <em>your menu bar.</em>
      </SectionTitle>
      <SectionLede>
        Native Swift. No Electron. No analytics. Three modes, three keystrokes, one icon.
      </SectionLede>

      <div className="features">
        <Feature
          span={6}
          icon="menubar"
          title="Menu‑bar native"
          body="A 22×22 icon that lives where it belongs — between your Wi‑Fi and your battery. Drag it anywhere. Hide it with ⌘‑drag. It behaves."
        >
          <div className="bytes">
            <span className="byte hi">QUIET</span>
            <span className="byte">AWARE</span>
            <span className="byte">IMMERSION</span>
          </div>
        </Feature>

        <Feature
          span={6}
          icon="command"
          title="Global hotkeys"
          body="Triple‑bind ⌃⌥1, ⌃⌥2, ⌃⌥3 to switch modes from anywhere — from a video call, from Logic Pro, from full‑screen Xcode."
        >
          <div className="kbd-row">
            <span className="kbd">⌃</span>
            <span className="kbd">⌥</span>
            <span className="kbd">1</span>
            <span style={{ color: "var(--fg-4)", alignSelf: "center", margin: "0 6px" }}>
              → Quiet
            </span>
          </div>
        </Feature>

        <Feature
          span={4}
          icon="bolt"
          title="< 200 ms switch"
          body="Direct BLE write to the headphones — no cloud round‑trip, no app launch, no spinner."
        />

        <Feature
          span={4}
          icon="shield"
          title="Local & private"
          body="Zero analytics, zero accounts. The app talks to your headphones, full stop."
        />

        <Feature
          span={4}
          icon="code"
          title="Reverse‑engineered BMAP"
          body="The exact Bose protocol the iOS app uses, lifted from the APK and re‑implemented in 1 Swift file."
        >
          <div className="protocol-block">
            <div>
              <span className="tk-key">FBlock</span> = <span className="tk-num">0x1F</span>
            </div>
            <div>
              <span className="tk-key">Function</span> = <span className="tk-num">0x03</span>{" "}
              <span style={{ color: "var(--fg-4)" }}>// SET</span>
            </div>
            <div>
              <span className="tk-key">Mode</span> = <span className="tk-num">0x00</span>{" "}
              <span style={{ color: "var(--fg-4)" }}>// Quiet</span>
            </div>
          </div>
        </Feature>
      </div>
    </section>
  );
}
