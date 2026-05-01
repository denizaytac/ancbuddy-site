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
            <span>Beta tester</span>
            <span className="quote-meta-dot" />
            <span>r/bose</span>
          </div>
        </div>
        <div
          className="quote-card reveal"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <p>"Tiny, native, does one thing well. The kind of mac app I keep paying for."</p>
          <div className="quote-meta">
            <span>Lemon Squeezy customer</span>
            <span className="quote-meta-dot" />
            <span>April 2026</span>
          </div>
        </div>
        <div
          className="quote-card reveal"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          <p>
            "Worked first try with my QC Ultra Earbuds 2nd Gen. The hotkeys made me fire my phone."
          </p>
          <div className="quote-meta">
            <span>tofu79</span>
            <span className="quote-meta-dot" />
            <span>r/bose</span>
          </div>
        </div>
      </div>
    </section>
  );
}
