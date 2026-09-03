export function Quotes() {
  return (
    <section className="container">
      <div className="quote-row">
        <div className="quote-card reveal">
          <p>
            "Finally — exactly the menu‑bar app I wished Bose itself shipped. Switching modes from a
            Zoom call is the killer feature."
          </p>
          <div className="quote-meta">
            <span>Early beta feedback</span>
            <span className="quote-meta-dot" />
            <span>Source on file</span>
          </div>
        </div>
        <div
          className="quote-card reveal"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <p>
            <strong>Signed and notarized for macOS.</strong>
            <br />
            The current 2.2.0 DMG is published through GitHub Releases and includes a 14-day trial.
          </p>
          <div className="quote-meta">
            <span>Release proof</span>
            <span className="quote-meta-dot" />
            <span>Version 2.2.0</span>
          </div>
        </div>
        <div
          className="quote-card reveal"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          <p>"Worked first try with my QC Ultra Earbuds 2nd Gen."</p>
          <div className="quote-meta">
            <span>Earbuds tester feedback</span>
            <span className="quote-meta-dot" />
            <span>Source on file</span>
          </div>
        </div>
      </div>
    </section>
  );
}
