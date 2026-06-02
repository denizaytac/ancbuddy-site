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
          Mac menu-bar app · 14-day trial
        </span>
        <div className="price-amount">
          <span className="cur">$</span>9.99
        </div>
        <div className="price-tag">One‑time purchase · No subscription · Updates included</div>

        <ul className="price-list">
          <li>
            <Icon name="check" size={14} /> Quiet, Aware, and Immersion from your Mac
          </li>
          <li>
            <Icon name="check" size={14} /> AI Auto-EQ sound profiles
          </li>
          <li>
            <Icon name="check" size={14} /> All Bose QC Ultra devices
          </li>
          <li>
            <Icon name="check" size={14} /> Built-in update checks
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
          Or <button onClick={() => openTrial(true)}>try ANCBuddy free for 14 days</button>
        </div>
      </div>
    </section>
  );
}
