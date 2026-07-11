import type {
  Dashboard,
  Decision,
  Execution,
  GithubIntegration,
  ManualOutcome,
} from "./types";

const configuredBase = import.meta.env.VITE_GROWTH_AGENT_API_URL?.trim();
const apiBase = configuredBase?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 401) throw new Error("AUTH_REQUIRED");
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(token: string): Promise<void> {
  await request<{ ok: true }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function loadDashboard(): Promise<Dashboard> {
  return request<Dashboard>("/api/dashboard");
}

export function submitDecision(
  actionId: string,
  decision: Decision,
  expectedVersion: number,
  feedback?: string,
): Promise<{ dashboard: Dashboard }> {
  return request<{ dashboard: Dashboard }>(`/api/actions/${actionId}/decisions`, {
    method: "POST",
    body: JSON.stringify({ decision, expected_version: expectedVersion, feedback }),
  });
}

export function loadGithubIntegration(): Promise<GithubIntegration> {
  return request<GithubIntegration>("/api/integrations/github");
}

export function saveGithubIntegration(token: string): Promise<GithubIntegration> {
  return request<GithubIntegration>("/api/integrations/github", {
    method: "PUT",
    body: JSON.stringify({ token }),
  });
}

export function deleteGithubIntegration(): Promise<void> {
  return request<void>("/api/integrations/github", { method: "DELETE" });
}

export function enableGithubIntegration(
  mode: "canary" | "live" = "canary",
): Promise<GithubIntegration> {
  return request<GithubIntegration>("/api/integrations/github/enable", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export function loadExecution(executionId: string): Promise<Execution> {
  return request<Execution>(`/api/executions/${executionId}`);
}

export function submitManualOutcome(
  actionId: string,
  eventType: ManualOutcome,
  note?: string,
): Promise<{ dashboard: Dashboard }> {
  return request<{ dashboard: Dashboard }>(`/api/actions/${actionId}/manual-outcomes`, {
    method: "POST",
    body: JSON.stringify({ event_type: eventType, note }),
  });
}
