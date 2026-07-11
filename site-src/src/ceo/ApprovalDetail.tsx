import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Check,
  ExternalLink,
  FileText,
  LoaderCircle,
  Mail,
  MessageCircleReply,
  PencilLine,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GrowthAction, ManualOutcome } from "./types";

type ApprovalDetailProps = {
  action: GrowthAction;
  isSubmitting: boolean;
  onApprove: () => void;
  onChange: () => void;
  onReject: () => void;
  onOutcome: (outcome: ManualOutcome) => void;
  approvalBlocker?: string;
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

  if (action.type === "site_pr") {
    const files = action.content.files ?? [];
    return (
      <section className="ceo-pr-preview" aria-label="Exact draft pull request content">
        <header>
          <div>
            <span>Exact approved change</span>
            <strong>{files.length} {files.length === 1 ? "file" : "files"}</strong>
          </div>
          <p>These paths and their complete text are what the executor will put in the draft PR.</p>
        </header>
        <dl>
          <div><dt>PR title</dt><dd>{action.content.title ?? action.title}</dd></div>
          <div><dt>PR body</dt><dd>{action.content.body ?? action.content.preview ?? "No PR body supplied."}</dd></div>
        </dl>
        <div className="ceo-pr-files">
          {files.map((file) => (
            <article key={file.path}>
              <h3><FileText aria-hidden="true" /> {file.path}</h3>
              <pre tabIndex={0}>{file.content}</pre>
            </article>
          ))}
        </div>
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

function gmailComposeUrl(action: GrowthAction) {
  if (action.gmail_compose_url) return action.gmail_compose_url;
  const { to, subject, body } = action.content;
  if (!to || !subject || !body) return "";
  const params = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

const executionPresentation = {
  queued: { label: "Queued", detail: "Waiting for the executor on the VPS.", icon: Clock3 },
  running: { label: "Executing", detail: "Creating the exact approved draft PR.", icon: LoaderCircle },
  succeeded: { label: "Executed", detail: "The draft PR was created. Nothing was merged or published.", icon: CheckCircle2 },
  failed: { label: "Failed", detail: "No successful external result was recorded.", icon: CircleAlert },
  unknown: { label: "Needs review", detail: "GitHub may have accepted the change, but the final result could not be confirmed. Check the audit trail before retrying.", icon: CircleAlert },
  cancelled: { label: "Cancelled", detail: "This execution will not run.", icon: X },
};

function ExecutionPanel({ action }: { action: GrowthAction }) {
  const execution = action.execution;
  if (!execution) return null;
  const presentation = executionPresentation[execution.status];
  const Icon = presentation.icon;
  return (
    <section className="ceo-execution-panel" data-status={execution.status} aria-label={`Execution status: ${presentation.label}`}>
      <Icon className={execution.status === "running" ? "ceo-spinning" : undefined} aria-hidden="true" />
      <div>
        <span>Website execution</span>
        <strong>{presentation.label}</strong>
        <p>{execution.error || presentation.detail}</p>
      </div>
      {execution.external_url ? (
        <Button asChild type="button" variant="outline" size="sm">
          <a href={execution.external_url} target="_blank" rel="noreferrer">
            Open draft PR <ExternalLink />
          </a>
        </Button>
      ) : null}
    </section>
  );
}

function EmailFollowUp({
  action,
  isSubmitting,
  onOutcome,
}: {
  action: GrowthAction;
  isSubmitting: boolean;
  onOutcome: (outcome: ManualOutcome) => void;
}) {
  if (action.type !== "email" || action.status === "awaiting_approval") return null;
  const readyToSend = action.status === "approved";
  const composeUrl = readyToSend ? gmailComposeUrl(action) : "";
  if (readyToSend && !composeUrl) return null;
  return (
    <section className="ceo-email-followup" aria-labelledby="email-ready-title">
      <div>
        <Mail aria-hidden="true" />
        <div>
          <span>{readyToSend ? "Approved draft" : "Manual send recorded"}</span>
          <strong id="email-ready-title">{readyToSend ? "Ready to send manually" : "Email marked as sent"}</strong>
          <p>{readyToSend ? "Gmail opens with this exact recipient, subject, and body. You still press Send." : "The compose link is closed to prevent a duplicate send. Record any reply below."}</p>
        </div>
      </div>
      {readyToSend ? (
        <Button asChild variant="approve">
          <a href={composeUrl} target="_blank" rel="noreferrer">
            <Send /> Open in Gmail
          </a>
        </Button>
      ) : null}
      <div className="ceo-outcome-buttons" aria-label="Record email outcome">
        <span>Then record:</span>
        {readyToSend ? (
          <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOutcome("sent")}><Send /> Sent</Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOutcome("reply")}><MessageCircleReply /> Reply</Button>
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOutcome("positive")}><ThumbsUp /> Positive</Button>
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOutcome("negative")}><ThumbsDown /> Negative</Button>
          </>
        )}
      </div>
    </section>
  );
}

export function ApprovalDetail({
  action,
  isSubmitting,
  onApprove,
  onChange,
  onReject,
  onOutcome,
  approvalBlocker,
}: ApprovalDetailProps) {
  const ActionIcon = actionIcons[action.type];
  const isAwaitingApproval = action.status === "awaiting_approval";
  const blocker = action.approval_blocker ?? action.approval_block_reason ?? approvalBlocker;
  const approvalLabel = action.type === "site_pr"
    ? "Approve & create draft PR"
    : action.type === "email"
      ? "Approve email draft"
      : "Approve & queue";

  return (
    <article className="ceo-detail" data-awaiting={isAwaitingApproval} aria-labelledby="selected-action-title">
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

      <ExecutionPanel action={action} />
      <EmailFollowUp action={action} isSubmitting={isSubmitting} onOutcome={onOutcome} />

      {isAwaitingApproval ? (
        <footer className="ceo-detail-footer">
          {blocker ? <p className="ceo-approval-blocker" role="note"><CircleAlert /> {blocker}</p> : null}
          <div className="ceo-actions">
            <Button type="button" variant="approve" onClick={onApprove} disabled={isSubmitting || Boolean(blocker)} aria-describedby={blocker ? "approval-blocker-tip" : undefined}>
              <Check data-icon="inline-start" />
              {isSubmitting ? "Saving…" : approvalLabel}
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
          <p id="approval-blocker-tip">{blocker ? "Resolve the issue above before approval." : "Tip: press ⌘ ↵ to approve the exact version shown."}</p>
        </footer>
      ) : null}
    </article>
  );
}
