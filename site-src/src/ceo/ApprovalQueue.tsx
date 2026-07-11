import { ChevronRight, ListChecks } from "lucide-react";
import type { GrowthAction } from "./types";

type ApprovalQueueProps = {
  actions: GrowthAction[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ApprovalQueue({ actions, selectedId, onSelect }: ApprovalQueueProps) {
  const pendingCount = actions.filter((action) => action.status === "awaiting_approval").length;
  return (
    <section className="ceo-queue" aria-labelledby="approval-queue-title">
      <header className="ceo-queue-heading">
        <div>
          <h2 id="approval-queue-title">{pendingCount > 0 ? `${pendingCount} decisions need you` : "Recent actions"}</h2>
          <p>{pendingCount > 0 ? "Review and act in seconds." : "Follow execution and manual sends."}</p>
        </div>
        <ListChecks aria-hidden="true" />
      </header>

      <div className="ceo-queue-list">
        {actions.map((action, index) => {
          const selected = action.id === selectedId;
          const actionStatus = action.execution?.status === "running"
            ? "Executing"
            : action.execution?.status === "succeeded"
              ? "Executed"
              : action.execution?.status
                ?? (action.gmail_compose_url
                  ? "Ready in Gmail"
                  : action.type === "email" && action.status === "evaluated"
                    ? "Feedback recorded"
                    : action.type === "email" && action.status === "observed"
                      ? "Reply recorded"
                      : action.type === "email" && action.status === "executed"
                        ? "Sent recorded"
                        : action.channel);
          return (
            <button
              key={action.id}
              type="button"
              className="ceo-queue-row"
              data-selected={selected}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(action.id)}
            >
              <span className="ceo-queue-index">{index + 1}</span>
              <span className="ceo-queue-text">
                <strong>{action.title}</strong>
                <small>{actionStatus}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <footer className="ceo-queue-footer">
        <span>{pendingCount} pending</span>
        <span>⌘ J</span>
      </footer>
    </section>
  );
}
