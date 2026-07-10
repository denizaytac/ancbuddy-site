import { ChevronRight, ListChecks } from "lucide-react";
import type { GrowthAction } from "./types";

type ApprovalQueueProps = {
  actions: GrowthAction[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function ApprovalQueue({ actions, selectedId, onSelect }: ApprovalQueueProps) {
  return (
    <section className="ceo-queue" aria-labelledby="approval-queue-title">
      <header className="ceo-queue-heading">
        <div>
          <h2 id="approval-queue-title">{actions.length} decisions need you</h2>
          <p>Review and act in seconds.</p>
        </div>
        <ListChecks aria-hidden="true" />
      </header>

      <div className="ceo-queue-list">
        {actions.map((action, index) => {
          const selected = action.id === selectedId;
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
                <small>{action.channel}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <footer className="ceo-queue-footer">
        <span>{actions.length} pending</span>
        <span>⌘ J</span>
      </footer>
    </section>
  );
}
