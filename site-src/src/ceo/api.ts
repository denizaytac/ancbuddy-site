import type { Dashboard, Decision } from "./types";

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
