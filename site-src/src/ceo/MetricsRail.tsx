import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Dashboard } from "./types";

type MetricsRailProps = Pick<Dashboard, "goal" | "metrics" | "activity"> & {
  onViewActivity: () => void;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function MetricsRail({ goal, metrics, activity, onViewActivity }: MetricsRailProps) {
  return (
    <aside className="ceo-metrics" aria-label="Weekly outcomes">
      <section className="ceo-week">
        <h2>This week</h2>
        <dl>
          <div>
            <dt>Revenue <small>of {money(goal.target, goal.currency)} goal</small></dt>
            <dd>{money(metrics.revenue, goal.currency)}</dd>
          </div>
          <div><dt>Trial downloads</dt><dd>{metrics.trial_downloads}</dd></div>
          <div><dt>Replies</dt><dd>{metrics.replies}</dd></div>
        </dl>
      </section>
      <section className="ceo-agent-note">
        <h2><Sparkles aria-hidden="true" /> Agent note</h2>
        <p>{activity.agent_note ?? "The next analysis will explain which channel deserves attention."}</p>
      </section>
      <section className="ceo-activity">
        <h2>Activity</h2>
        <dl>
          <div><dt>Last analysis</dt><dd>{activity.last_analysis ?? "Not run yet"}</dd></div>
          <div><dt>Next run</dt><dd>{activity.next_run ?? "Not scheduled"}</dd></div>
        </dl>
        <button type="button" onClick={onViewActivity}>
          View recent activity <ArrowUpRight aria-hidden="true" />
        </button>
      </section>
    </aside>
  );
}
