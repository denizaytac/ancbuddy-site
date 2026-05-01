import { Icon } from "../Icon";

export function CTA() {
  return (
    <section className="container">
      <div className="cta-banner reveal">
        <h2>
          Ready to <em>silence the room?</em>
        </h2>
        <p className="section-lede" style={{ margin: "0 auto" }}>
          ANCBuddy is a one‑time $9.99. Free trial available. Lifetime updates.
        </p>
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 28 }}>
          <a className="btn btn-accent" href="#pricing">
            <Icon name="bolt" size={15} /> Get ANCBuddy
          </a>
          <a className="btn btn-ghost" href="https://github.com/denizaytac/ancbuddy-site">
            <Icon name="github" size={15} /> Source on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
