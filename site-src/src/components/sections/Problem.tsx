import { Eyebrow, SectionTitle, SectionLede } from "./Section";

export function Problem() {
  return (
    <section id="why" className="section container">
      <div className="split">
        <div>
          <Eyebrow>Why ANCBuddy</Eyebrow>
          <SectionTitle>
            Keep everyday controls <em>off your phone.</em>
          </SectionTitle>
          <SectionLede>
            The Bose app is useful for setup and firmware. ANCBuddy keeps modes, audio
            sources, and battery status in the menu bar while you work on your Mac.
          </SectionLede>
        </div>
        <div className="compare">
          <div className="compare-row">
            <div className="compare-card before reveal">
              <div className="compare-tag">Bose app</div>
              <div className="compare-headline">Pick up phone, unlock, open app, wait, tap</div>
              <div className="compare-steps">
                <span>Mode and source changes leave your Mac workflow</span>
                <span>Sound tweaks live in a separate app</span>
              </div>
            </div>
            <div
              className="compare-card after reveal"
              style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
            >
              <div className="compare-tag">ANCBuddy</div>
              <div className="compare-headline">Open the panel, switch modes or sources</div>
              <div className="compare-steps">
                <span>Modes, sources, and battery in one place</span>
                <span>Optional AI Auto-EQ when music is playing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
