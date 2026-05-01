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
            Bose's official app makes you unlock a phone, find the app, wait for it to connect, tap
            through a carousel — just to toggle a mode you change ten times a day. ANCBuddy lives in
            your menu bar. One click. Done.
          </SectionLede>
        </div>
        <div className="compare">
          <div className="compare-row">
            <div className="compare-card before reveal">
              <div className="compare-tag">Bose Music</div>
              <div className="compare-headline">Pick up phone → unlock → open app → wait → tap</div>
              <div className="compare-steps">
                <span>↳ ~6 seconds</span>
                <span>↳ 5 taps</span>
                <span>↳ phone in hand</span>
              </div>
            </div>
            <div
              className="compare-card after reveal"
              style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
            >
              <div className="compare-tag">ANCBuddy</div>
              <div className="compare-headline">⌃⌥1</div>
              <div className="compare-steps">
                <span>↳ &lt; 200 ms</span>
                <span>↳ 1 keystroke</span>
                <span>↳ no context switch</span>
              </div>
            </div>
          </div>
          <div className="compare-row">
            <div
              className="compare-card before reveal"
              style={{ "--reveal-delay": "50ms" } as React.CSSProperties}
            >
              <div className="compare-tag">Bose Music</div>
              <div className="compare-headline">Re‑authenticate when it forgets your headphones</div>
              <div className="compare-steps">
                <span>↳ feels like a phone OS update</span>
              </div>
            </div>
            <div
              className="compare-card after reveal"
              style={{ "--reveal-delay": "150ms" } as React.CSSProperties}
            >
              <div className="compare-tag">ANCBuddy</div>
              <div className="compare-headline">Pairs once. Stays paired.</div>
              <div className="compare-steps">
                <span>↳ uses BLE service UUID, not the device name</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
