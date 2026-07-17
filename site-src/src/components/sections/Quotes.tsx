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
          <p>"Tiny, native, does one thing well. The kind of Mac app that stays out of the way."</p>
          <div className="quote-meta">
            <span>Early product feedback</span>
            <span className="quote-meta-dot" />
            <span>April 2026</span>
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
