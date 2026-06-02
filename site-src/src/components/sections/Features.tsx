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
        One place for <em>modes, sound, and status.</em>
      </SectionTitle>
      <SectionLede>
        ANCBuddy puts the Bose controls you actually use in your Mac menu bar, ready while
        you work, listen, and move between calls.
      </SectionLede>

      <div className="features">
        <Feature
          span={6}
          icon="menubar"
          title="Mac menu-bar control"
          body="A quiet menu-bar icon opens the controls you need: headphone status, battery, listening modes, sound profile, and app actions."
        >
          <div className="bytes">
            <span className="byte hi">QUIET</span>
            <span className="byte">AWARE</span>
            <span className="byte">IMMERSION</span>
          </div>
        </Feature>

        <Feature
          span={6}
          icon="bolt"
          title="AI Auto-EQ sound profiles"
          body="When you turn it on, ANCBuddy reads the current track and applies a visible Bass/Mid/Treble profile shaped for the song."
        >
          <div className="eq-strip">
            <span>Bass +4</span>
            <span>Mid +1</span>
            <span>Treble +3</span>
          </div>
        </Feature>

        <Feature
          span={4}
          icon="headphones"
          title="One-click modes"
          body="Switch Quiet, Aware, and Immersion from the Mac menu bar, with immediate feedback while the headphones confirm the change."
        />

        <Feature
          span={4}
          icon="device"
          title="Built for daily use"
          body="Launch at Login and Check for Updates live inside the panel, so ANCBuddy behaves like the small Mac utility it is."
        />

        <Feature
          span={4}
          icon="shield"
          title="Private by default"
          body="Mode control is direct and local. AI Auto-EQ is opt-in and sends track metadata to ANCBuddy's relay only while the feature is enabled."
        />
      </div>
    </section>
  );
}
