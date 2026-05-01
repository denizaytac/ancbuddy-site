import { Icon } from "../Icon";
import { Eyebrow, SectionTitle } from "./Section";
import { useTrialDialog } from "@/hooks/useTrialDialog";

const LEMON_SQUEEZY_URL =
  "https://ancbuddy.lemonsqueezy.com/checkout/buy/b79f3888-28fa-4438-8328-fb604518cbc2";

export function Pricing() {
  const { setOpen: openTrial } = useTrialDialog();

  return (
    <section id="pricing" className="section container">
      <Eyebrow>Pricing</Eyebrow>
      <SectionTitle>
        One price. <em>Yours forever.</em>
      </SectionTitle>

      <div className="pricing-card reveal">
        <span className="pill" style={{ background: "transparent" }}>
          <span className="pill-dot" />
          Launch week — code{" "}
          <strong style={{ color: "var(--accent)", marginLeft: 4 }}>LAUNCH10</strong> (10% off)
        </span>
        <div className="price-amount">
          <span className="cur">$</span>9.99
        </div>
        <div className="price-tag">One‑time purchase · No subscription · Lifetime updates</div>

        <ul className="price-list">
          <li>
            <Icon name="check" size={14} /> All current and future modes
          </li>
          <li>
            <Icon name="check" size={14} /> Global hotkeys
          </li>
          <li>
            <Icon name="check" size={14} /> All Bose QC Ultra devices
          </li>
          <li>
            <Icon name="check" size={14} /> Free updates, forever
          </li>
          <li>
            <Icon name="check" size={14} /> Email support, from the dev directly
          </li>
        </ul>

        <a
          className="btn btn-accent"
          href={LEMON_SQUEEZY_URL}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Icon name="bolt" size={15} /> Buy ANCBuddy — $9.99
        </a>
        <div className="price-foot">
          Or{" "}
          <button onClick={() => openTrial(true)}>download the free trial</button> · email‑gated · 14
          days
        </div>
      </div>
    </section>
  );
}
