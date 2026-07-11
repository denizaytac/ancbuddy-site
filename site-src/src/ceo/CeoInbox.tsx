import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Menu,
  PlugZap,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalDetail } from "./ApprovalDetail";
import { ApprovalQueue } from "./ApprovalQueue";
import {
  loadDashboard,
  loadGithubIntegration,
  submitDecision,
  submitManualOutcome,
} from "./api";
import { demoDashboard } from "./demo";
import { IntegrationsView } from "./IntegrationsView";
import { LoginGate } from "./LoginGate";
import { MetricsRail } from "./MetricsRail";
import type {
  ApiState,
  Dashboard,
  Decision,
  GithubIntegration,
  GrowthAction,
  ManualOutcome,
} from "./types";

type View = "inbox" | "outcomes" | "learning" | "integrations";

const demoMode = import.meta.env.VITE_GROWTH_DEMO === "true";

const navigation = [
  { id: "inbox" as const, label: "Inbox", icon: Inbox },
  { id: "outcomes" as const, label: "Outcomes", icon: TrendingUp },
  { id: "learning" as const, label: "Learning", icon: BookOpen },
  { id: "integrations" as const, label: "Integrations", icon: PlugZap },
];

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function AppNavigation({ active, onChange }: { active: View; onChange: (view: View) => void }) {
  return (
    <nav className="ceo-navigation" aria-label="CEO Inbox sections">
      {navigation.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          data-active={active === id}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function GoalBand({ dashboard }: { dashboard: Dashboard }) {
  const { target, earned, currency } = dashboard.goal;
  const progress = target > 0 ? Math.min(100, Math.round((earned / target) * 100)) : 0;
  return (
    <section className="ceo-goal" aria-labelledby="weekly-goal-title">
      <p className="ceo-mobile-goal-summary">{money(earned, currency)} of {money(target, currency)}</p>
      <div>
        <span>Weekly goal</span>
        <h1 id="weekly-goal-title">
          {money(target, currency)} <em>total revenue</em>
        </h1>
      </div>
      <div className="ceo-goal-progress">
        <p><strong>{money(earned, currency)}</strong> earned</p>
        <div className="ceo-progress-row">
          <div
            className="ceo-progress-track"
            role="progressbar"
            aria-label="Revenue goal progress"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={earned}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </div>
    </section>
  );
}

function EmptyInbox() {
  return (
    <Empty className="ceo-empty-state">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Check /></EmptyMedia>
        <EmptyTitle>Nothing needs your attention</EmptyTitle>
        <EmptyDescription>The agent will place only high-confidence external actions here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function OutcomesView({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section className="ceo-secondary-view" aria-labelledby="outcomes-title">
      <header><Activity /><div><h2 id="outcomes-title">Outcomes</h2><p>Measured signals, not activity theatre.</p></div></header>
      <dl className="ceo-outcome-list">
        <div><dt>Attributed revenue</dt><dd>{money(dashboard.metrics.revenue, dashboard.goal.currency)}</dd></div>
        <div><dt>Trial downloads</dt><dd>{dashboard.metrics.trial_downloads}</dd></div>
        <div><dt>Replies</dt><dd>{dashboard.metrics.replies}</dd></div>
      </dl>
      <p className="ceo-secondary-note">Completed experiments will appear by channel after the agent has enough evidence to evaluate them.</p>
    </section>
  );
}

function LearningView({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section className="ceo-secondary-view" aria-labelledby="learning-title">
      <header><Sparkles /><div><h2 id="learning-title">Learning</h2><p>The current growth thesis in plain language.</p></div></header>
      <blockquote>{dashboard.activity.agent_note ?? "No evaluated learning is available yet."}</blockquote>
      <p className="ceo-secondary-note">Rejected ideas and observed outcomes feed the next run; they never authorize a future external action.</p>
    </section>
  );
}

export function CeoInbox() {
  const [apiState, setApiState] = useState<ApiState>(() =>
    demoMode ? { kind: "ready", dashboard: demoDashboard } : { kind: "loading" },
  );
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [githubIntegration, setGithubIntegration] = useState<GithubIntegration | null>(
    demoMode
      ? {
          provider: "github",
          configured: true,
          repository: "denizaytac/ancbuddy-site",
          mode: "canary",
          status: "ready",
        }
      : null,
  );

  const fetchDashboard = useCallback(async (showLoading = true) => {
    if (demoMode) {
      setApiState({ kind: "ready", dashboard: demoDashboard });
      return;
    }
    if (showLoading) setApiState({ kind: "loading" });
    try {
      const [dashboard, integration] = await Promise.all([
        loadDashboard(),
        loadGithubIntegration().catch(() => null),
      ]);
      setApiState({ kind: "ready", dashboard });
      if (integration) setGithubIntegration(integration);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        setApiState({ kind: "login" });
      } else {
        setApiState({ kind: "error", message: error instanceof Error ? error.message : "Unable to load the inbox." });
      }
    }
  }, []);

  useEffect(() => {
    if (demoMode) return;
    const timer = window.setTimeout(() => void fetchDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchDashboard]);

  const dashboard = apiState.kind === "ready" ? apiState.dashboard : null;
  const actions = useMemo(
    () => dashboard?.actions.filter((action) =>
      action.status === "awaiting_approval"
      || Boolean(action.execution)
      || Boolean(action.gmail_compose_url)
      || (
        action.type === "email"
        && ["approved", "executed", "observed", "evaluated"].includes(action.status)
      ),
    ) ?? [],
    [dashboard],
  );
  const effectiveSelectedId = actions.some((action) => action.id === selectedId)
    ? selectedId
    : actions[0]?.id ?? "";

  const selectedAction = useMemo(
    () => actions.find((action) => action.id === effectiveSelectedId) ?? actions[0],
    [actions, effectiveSelectedId],
  );
  const pendingCount = actions.filter((action) => action.status === "awaiting_approval").length;

  const selectedApprovalBlocker = useMemo(() => {
    if (!selectedAction || selectedAction.status !== "awaiting_approval") return undefined;
    const backendBlocker = selectedAction.approval_blocker ?? selectedAction.approval_block_reason;
    if (backendBlocker) return backendBlocker;
    if (selectedAction.approval_ready === false) return "This draft is not ready for approval yet.";
    if (selectedAction.type === "site_pr" && selectedAction.approval_ready !== true) {
      if (!githubIntegration?.configured) return "Connect and test GitHub in Integrations before approval.";
      if (githubIntegration.status !== "ready") return githubIntegration.last_error ?? "Save and test a GitHub token for this repository before approval.";
      if (githubIntegration.mode === "disabled" || githubIntegration.mode === "paused") return "Enable the one-PR canary in Integrations before approval.";
    }
    if (selectedAction.type === "email" && (!selectedAction.content.to || !selectedAction.content.subject || !selectedAction.content.body)) {
      return "The email needs one exact recipient, subject, and body before approval.";
    }
    return undefined;
  }, [githubIntegration, selectedAction]);

  const decide = useCallback(async (decision: Decision, action: GrowthAction, note?: string) => {
    setSubmitting(true);
    setAnnouncement("");
    try {
      if (demoMode && dashboard) {
        const nextActions = dashboard.actions.flatMap((item) => {
          if (item.id !== action.id) return [item];
          if (decision !== "approve") return [];
          if (item.type === "email") {
            return [{ ...item, status: "approved", gmail_compose_url: undefined }];
          }
          if (item.type === "site_pr") {
            return [{
              ...item,
              status: "approved",
              execution: {
                id: `demo-${item.id}`,
                status: "queued" as const,
                provider: "github",
              },
            }];
          }
          return [];
        });
        setApiState({
          kind: "ready",
          dashboard: {
            ...dashboard,
            actions: nextActions,
            activity: {
              ...dashboard.activity,
              agent_note: decision === "change"
                ? "Your feedback is now a constraint for the next draft. It does not authorize sending."
                : `The ${action.channel.toLowerCase()} action was ${decision === "approve" ? "approved and queued" : "rejected"}.`,
            },
          },
        });
      } else {
        const response = await submitDecision(action.id, decision, action.version, note);
        setApiState({ kind: "ready", dashboard: response.dashboard });
      }
      setAnnouncement(
        decision === "approve"
          ? action.type === "email"
            ? "Email draft approved. Open it in Gmail and press Send."
            : action.type === "site_pr"
              ? "Approved. The draft PR is queued for the VPS executor."
              : "Approved and queued."
          : decision === "change"
            ? "Feedback sent to the agent."
            : "Action rejected.",
      );
      setFeedback("");
      setChangeOpen(false);
      setRejectOpen(false);
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : "The decision could not be saved.");
      if (!demoMode) await fetchDashboard(false);
    } finally {
      setSubmitting(false);
    }
  }, [dashboard, fetchDashboard]);

  const recordOutcome = useCallback(async (action: GrowthAction, outcome: ManualOutcome) => {
    setSubmitting(true);
    setAnnouncement("");
    try {
      if (demoMode && dashboard) {
        setAnnouncement(`${outcome.charAt(0).toUpperCase() + outcome.slice(1)} recorded.`);
        return;
      }
      const response = await submitManualOutcome(action.id, outcome);
      setApiState({ kind: "ready", dashboard: response.dashboard });
      setAnnouncement(`${outcome.charAt(0).toUpperCase() + outcome.slice(1)} recorded for the feedback loop.`);
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : "The outcome could not be recorded.");
      if (!demoMode) await fetchDashboard(false);
    } finally {
      setSubmitting(false);
    }
  }, [dashboard, fetchDashboard]);

  const hasActiveExecution = dashboard?.actions.some((action) =>
    action.execution?.status === "queued"
    || action.execution?.status === "running",
  ) ?? false;

  useEffect(() => {
    if (demoMode || !hasActiveExecution) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const nextDashboard = await loadDashboard();
          setApiState({ kind: "ready", dashboard: nextDashboard });
          // Read the provider after the terminal job state so the final poll
          // cannot miss the transaction's automatic canary pause.
          const integration = await loadGithubIntegration().catch(() => null);
          if (integration) setGithubIntegration(integration);
        } catch {
          // A later poll or manual refresh will retry without disrupting review.
        }
      })();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveExecution]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!selectedAction || view !== "inbox" || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (selectedAction.status === "awaiting_approval" && !selectedApprovalBlocker) void decide("approve", selectedAction);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setChangeOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide, selectedAction, selectedApprovalBlocker, view]);

  if (apiState.kind === "loading") {
    return <main className="ceo-loading"><RefreshCw aria-hidden="true" /><p>Loading CEO Inbox…</p></main>;
  }
  if (apiState.kind === "login") {
    return <LoginGate initialError={apiState.error} onSuccess={() => void fetchDashboard()} />;
  }
  if (apiState.kind === "error") {
    return (
      <main className="ceo-loading">
        <p>{apiState.message}</p>
        <Button type="button" variant="outline" onClick={() => void fetchDashboard()}>
          <RefreshCw data-icon="inline-start" /> Retry
        </Button>
      </main>
    );
  }

  return (
    <div className="ceo-app">
      <aside className="ceo-sidebar">
        <a className="ceo-brand-wordmark" href="/" aria-label="ANCBuddy website">ANCBuddy</a>
        <AppNavigation active={view} onChange={setView} />
        <div className="ceo-agent-status"><span /><div><strong>Agent online</strong><small>Approval mode</small></div><ChevronRight /></div>
      </aside>

      <header className="ceo-topbar">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="ceo-mobile-menu" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="ceo-mobile-sheet">
            <SheetHeader>
              <SheetTitle>ANCBuddy</SheetTitle>
              <SheetDescription>CEO Inbox navigation</SheetDescription>
            </SheetHeader>
            <AppNavigation active={view} onChange={(nextView) => {
              setView(nextView);
              setMobileNavOpen(false);
            }} />
          </SheetContent>
        </Sheet>
        <a className="ceo-topbar-brand" href="/">ANCBuddy</a>
        <h1>CEO Inbox</h1>
        <span className="ceo-topbar-mode"><span /> Approval required</span>
      </header>

      <main className="ceo-main">
        <GoalBand dashboard={apiState.dashboard} />

        {view === "inbox" ? (
          actions.length > 0 && selectedAction ? (
            <div className="ceo-workspace">
              <ApprovalQueue actions={actions} selectedId={selectedAction.id} onSelect={setSelectedId} />
              <div className="ceo-mobile-pager" aria-label="Approval queue position">
                <h2>{pendingCount > 0 ? `${pendingCount} decisions need you` : "Recent actions"}</h2>
                <div>
                  <button type="button" aria-label="Previous decision" onClick={() => {
                    const current = actions.findIndex((action) => action.id === selectedAction.id);
                    setSelectedId(actions[(current - 1 + actions.length) % actions.length].id);
                  }}><ChevronLeft /></button>
                  <span>{actions.findIndex((action) => action.id === selectedAction.id) + 1} of {actions.length}</span>
                  <button type="button" aria-label="Next decision" onClick={() => {
                    const current = actions.findIndex((action) => action.id === selectedAction.id);
                    setSelectedId(actions[(current + 1) % actions.length].id);
                  }}><ChevronRight /></button>
                </div>
              </div>
              <ApprovalDetail
                action={selectedAction}
                isSubmitting={isSubmitting}
                onApprove={() => void decide("approve", selectedAction)}
                onChange={() => setChangeOpen(true)}
                onReject={() => setRejectOpen(true)}
                onOutcome={(outcome) => void recordOutcome(selectedAction, outcome)}
                approvalBlocker={selectedApprovalBlocker}
              />
              <MetricsRail
                goal={apiState.dashboard.goal}
                metrics={apiState.dashboard.metrics}
                activity={apiState.dashboard.activity}
                onViewActivity={() => setView("outcomes")}
              />
            </div>
          ) : <EmptyInbox />
        ) : view === "outcomes" ? (
          <OutcomesView dashboard={apiState.dashboard} />
        ) : view === "learning" ? (
          <LearningView dashboard={apiState.dashboard} />
        ) : (
          <IntegrationsView
            integration={githubIntegration}
            onChange={(integration) => {
              setGithubIntegration(integration);
              if (!demoMode) void fetchDashboard(false);
            }}
            onAnnouncement={setAnnouncement}
          />
        )}
      </main>

      <p className="ceo-live-announcement" role="status" aria-live="polite">{announcement}</p>

      {selectedAction ? (
        <>
          <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
            <DialogContent className="ceo-decision-dialog">
              <DialogHeader>
                <DialogTitle>Request changes</DialogTitle>
                <DialogDescription>The agent will create a new version. This feedback does not authorize sending.</DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="change-feedback">What should change?</FieldLabel>
                  <Textarea id="change-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} autoFocus />
                  <FieldDescription>Be brief; one constraint is usually enough.</FieldDescription>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setChangeOpen(false)}>Cancel</Button>
                <Button type="button" variant="approve" disabled={!feedback.trim() || isSubmitting} onClick={() => void decide("change", selectedAction, feedback.trim())}>
                  Send feedback
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <AlertDialogContent className="ceo-decision-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this action?</AlertDialogTitle>
                <AlertDialogDescription>The rejection becomes a learning signal, but it will never approve a future action.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
                <AlertDialogAction onClick={() => void decide("reject", selectedAction)}>Reject action</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
