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
          <p>"AI Auto‑EQ is ANCBuddy at its best — track-by-track tuning, handled automatically."</p>
          <div className="quote-meta">
            <span>ANCBuddy</span>
            <span className="quote-meta-dot" />
            <span>Product highlight</span>
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
      <div className="product-hunt-proof reveal">
        <a
          href="https://www.producthunt.com/products/ancbuddy-for-bose-qc-ultra?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-ancbuddy-for-bose-qc-ultra"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View ANCBuddy for Bose QC Ultra on Product Hunt"
        >
          <img
            alt="ANCBuddy for Bose QC Ultra — featured on Product Hunt"
            width="250"
            height="54"
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1195105&theme=dark&t=1787558108420"
            loading="lazy"
            decoding="async"
          />
        </a>
      </div>
    </section>
  );
}
