export type Decision = "approve" | "reject" | "change";

export type ExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "unknown"
  | "cancelled";

export type Execution = {
  id: string;
  status: ExecutionStatus;
  provider: string;
  external_id?: string;
  external_url?: string;
  error?: string;
  attempts?: number;
  created_at?: string;
  updated_at?: string;
};

export type GithubIntegration = {
  provider: "github";
  configured: boolean;
  repository: string;
  mode: "disabled" | "canary" | "live" | "paused";
  status: "not_configured" | "ready" | "invalid" | "paused" | string;
  succeeded_count?: number;
  last_tested_at?: string;
  last_error?: string;
};

export type ManualOutcome = "sent" | "reply" | "positive" | "negative";

export type Signal = {
  level: string;
  detail: string;
};

export type GrowthAction = {
  id: string;
  version: number;
  type: "email" | "social" | "listing" | "site_pr" | "video" | "partnership";
  title: string;
  channel: string;
  status: string;
  approval_ready?: boolean;
  approval_blocker?: string;
  approval_block_reason?: string;
  execution?: Execution;
  gmail_compose_url?: string;
  expected_upside: Signal;
  evidence: Signal;
  risk: Signal;
  content: {
    to?: string;
    title?: string;
    subject?: string;
    body?: string;
    preview?: string;
    destination_url?: string;
    budget_minor?: number;
    budget_currency?: string;
    files?: Array<{ path: string; content: string }>;
  };
  created_at: string;
};

export type Dashboard = {
  goal: { target: number; earned: number; currency: string };
  metrics: { revenue: number; trial_downloads: number; replies: number };
  actions: GrowthAction[];
  activity: {
    last_analysis?: string;
    next_run?: string;
    agent_note?: string;
  };
};

export type ApiState =
  | { kind: "loading" }
  | { kind: "login"; error?: string }
  | { kind: "ready"; dashboard: Dashboard }
  | { kind: "error"; message: string };
