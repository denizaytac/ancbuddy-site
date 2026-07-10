import {
  ArrowUpRight,
  Check,
  FileText,
  Mail,
  PencilLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GrowthAction } from "./types";

type ApprovalDetailProps = {
  action: GrowthAction;
  isSubmitting: boolean;
  onApprove: () => void;
  onChange: () => void;
  onReject: () => void;
};

const actionIcons = {
  email: Mail,
  social: ArrowUpRight,
  listing: FileText,
  site_pr: FileText,
  video: FileText,
  partnership: Mail,
};

function SignalRow({
  icon: Icon,
  label,
  level,
  detail,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  level: string;
  detail: string;
}) {
  return (
    <div className="ceo-signal-row">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <div>
        <strong>{level.charAt(0).toUpperCase() + level.slice(1)}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function ActionPreview({ action }: { action: GrowthAction }) {
  const budget = action.content.budget_minor != null && action.content.budget_currency
    ? new Intl.NumberFormat("en", {
        style: "currency",
        currency: action.content.budget_currency,
      }).format(action.content.budget_minor / 100)
    : null;
  if (action.type === "email") {
    return (
      <section className="ceo-message-preview" aria-label="Approved email preview">
        <dl>
          <div><dt>To</dt><dd>{action.content.to ?? "Recipient missing"}</dd></div>
          <div><dt>Subject</dt><dd>{action.content.subject ?? "Subject missing"}</dd></div>
          {budget ? <div><dt>Budget</dt><dd>{budget}</dd></div> : null}
        </dl>
        <Separator />
        <p>{action.content.body ?? "Email body missing"}</p>
      </section>
    );
  }

  return (
    <section className="ceo-message-preview" aria-label="Action preview">
      {budget ? <p className="ceo-approved-budget">Maximum approved spend: {budget}</p> : null}
      <p>{action.content.preview ?? "The agent has not supplied a preview yet."}</p>
      {action.content.destination_url ? (
        <a href={action.content.destination_url} target="_blank" rel="noreferrer">
          Review destination <ArrowUpRight aria-hidden="true" />
        </a>
      ) : null}
    </section>
  );
}

export function ApprovalDetail({
  action,
  isSubmitting,
  onApprove,
  onChange,
  onReject,
}: ApprovalDetailProps) {
  const ActionIcon = actionIcons[action.type];

  return (
    <article className="ceo-detail" aria-labelledby="selected-action-title">
      <header className="ceo-detail-heading">
        <div className="ceo-detail-type">
          <ActionIcon aria-hidden="true" />
          <span>{action.type.replace("_", " ")}</span>
        </div>
        <Badge variant="secondary">{action.channel}</Badge>
        <h2 id="selected-action-title">{action.title}</h2>
      </header>

      <div className="ceo-signals">
        <SignalRow icon={ArrowUpRight} label="Expected upside" {...action.expected_upside} />
        <SignalRow icon={FileText} label="Evidence" {...action.evidence} />
        <SignalRow icon={ShieldCheck} label="Risk" {...action.risk} />
      </div>

      <ActionPreview action={action} />

      <footer className="ceo-detail-footer">
        <div className="ceo-actions">
          <Button type="button" variant="approve" onClick={onApprove} disabled={isSubmitting}>
            <Check data-icon="inline-start" />
            {isSubmitting ? "Queuing…" : "Approve & queue"}
          </Button>
          <Button type="button" variant="outline" onClick={onChange} disabled={isSubmitting}>
            <PencilLine data-icon="inline-start" />
            Request changes
          </Button>
          <Button type="button" variant="reject" onClick={onReject} disabled={isSubmitting}>
            <X data-icon="inline-start" />
            Reject
          </Button>
        </div>
        <p>Tip: press ⌘ ↵ to approve the exact version shown.</p>
      </footer>
    </article>
  );
}
