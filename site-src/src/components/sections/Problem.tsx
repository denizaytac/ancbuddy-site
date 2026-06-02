import { Eyebrow, SectionTitle, SectionLede } from "./Section";

export function Problem() {
  return (
    <section id="why" className="section container">
      <div className="split">
        <div>
          <Eyebrow>Why ANCBuddy</Eyebrow>
          <SectionTitle>
            Switch modes <em>without</em> reaching for your phone.
          </SectionTitle>
          <SectionLede>
            Bose Music is fine on a phone. It is not where you want to go when you are already
            working on your Mac. ANCBuddy keeps the everyday controls in the menu bar.
          </SectionLede>
        </div>
        <div className="compare">
          <div className="compare-row">
            <div className="compare-card before reveal">
              <div className="compare-tag">Bose Music</div>
              <div className="compare-headline">Pick up phone, unlock, open app, wait, tap</div>
              <div className="compare-steps">
                <span>Mode changes leave your Mac workflow</span>
                <span>Sound tweaks live in a separate app</span>
              </div>
            </div>
            <div
              className="compare-card after reveal"
              style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
            >
              <div className="compare-tag">ANCBuddy</div>
              <div className="compare-headline">Open the panel, switch modes, tune sound</div>
              <div className="compare-steps">
                <span>Quiet, Aware, and Immersion in one place</span>
                <span>AI Auto-EQ is ready when music is playing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
