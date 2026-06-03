import { Icon } from "../Icon";

export function CTA() {
  return (
    <section className="container">
      <div className="cta-banner reveal">
        <h2>
          Ready to make your QC Ultras <em>feel at home on your Mac?</em>
        </h2>
        <p className="section-lede" style={{ margin: "0 auto" }}>
          Try ANCBuddy free for 14 days. If it belongs in your menu bar, it&apos;s
          yours for a one-time $9.99.
        </p>
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 28 }}>
          <a className="btn btn-accent" href="#pricing">
            <Icon name="bolt" size={15} /> Get ANCBuddy
          </a>
        </div>
      </div>
    </section>
  );
}
