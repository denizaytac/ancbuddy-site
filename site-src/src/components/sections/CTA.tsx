import { Icon } from "../Icon";

export function CTA() {
  return (
    <section className="container">
      <div className="cta-banner reveal">
        <h2>
          Ready to make your QC Ultras <em>feel at home on your Mac?</em>
        </h2>
        <p className="section-lede" style={{ margin: "0 auto" }}>
          ANCBuddy is $9.99 once. Try it free for 14 days, then keep the Mac controls
          if it earns its spot in your menu bar.
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
