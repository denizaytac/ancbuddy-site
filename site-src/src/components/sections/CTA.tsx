import type { MouseEvent } from "react";
import { useTrialDialog } from "@/hooks/useTrialDialog";
import { Icon } from "../Icon";

export function CTA() {
  const { setOpen: openTrial } = useTrialDialog();

  function handleTrialClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.history.replaceState(null, "", "#trial");
    openTrial(true);
  }

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
          <a className="btn btn-accent" href="#trial" onClick={handleTrialClick}>
            <Icon name="bolt" size={15} /> Try 14 days for free
          </a>
        </div>
      </div>
    </section>
  );
}
