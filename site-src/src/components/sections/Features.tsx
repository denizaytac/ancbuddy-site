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
      <Eyebrow>Product tour</Eyebrow>
      <SectionTitle>
        One place for <em>modes, sources, and status.</em>
      </SectionTitle>
      <SectionLede>
        ANCBuddy puts the Bose controls you actually use in your Mac menu bar. Optional AI
        Auto-EQ stays available without taking over the daily workflow.
      </SectionLede>

      <div className="features">
        <Feature
          span={4}
          icon="headphones"
          title="One-click modes"
          body="Switch Quiet, Aware, and Immersion from the Mac menu bar, with immediate feedback while the headphones confirm the change."
        >
          <div className="bytes">
            <span className="byte hi">QUIET</span>
            <span className="byte">AWARE</span>
            <span className="byte">IMMERSION</span>
          </div>
        </Feature>

        <Feature
          span={8}
          icon="device"
          title="Audio Sources"
          body="See the active source, other connected sources, and devices remembered by your Bose QC Ultra. Switch to a remembered device or start pairing from the same panel."
        >
          <div className="source-visual" aria-hidden="true">
            <span className="source-visual-row is-active">
              <strong>This Mac</strong>
              <small>Active source</small>
            </span>
            <span className="source-visual-row">
              <strong>Phone</strong>
              <small>Connected</small>
            </span>
            <span className="source-visual-row">
              <strong>Remembered devices</strong>
              <small>Ready to switch</small>
            </span>
          </div>
        </Feature>

        <Feature
          span={4}
          icon="battery"
          title="Battery and live status"
          body="Check battery, connection, listening mode, and source state without leaving the app you are working in."
        />

        <Feature
          span={4}
          icon="bolt"
          title="Optional AI Auto-EQ"
          body="Turn it on when you want a visible Bass/Mid/Treble profile shaped for the current track. Leave it off for fully local daily controls."
        >
          <div className="eq-strip">
            <span>Bass +4</span>
            <span>Mid +1</span>
            <span>Treble +3</span>
          </div>
        </Feature>

        <Feature
          span={4}
          icon="shield"
          title="Private by default"
          body="Modes and audio-source control are direct and local. AI Auto-EQ is opt-in and sends track metadata to ANCBuddy's relay only while enabled."
        />
      </div>
    </section>
  );
}
