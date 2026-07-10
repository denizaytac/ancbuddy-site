export type Decision = "approve" | "reject" | "change";

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
  expected_upside: Signal;
  evidence: Signal;
  risk: Signal;
  content: {
    to?: string;
    subject?: string;
    body?: string;
    preview?: string;
    destination_url?: string;
    budget_minor?: number;
    budget_currency?: string;
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
