import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  KeyRound,
  LoaderCircle,
  PauseCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  deleteGithubIntegration,
  enableGithubIntegration,
  saveGithubIntegration,
} from "./api";
import type { GithubIntegration } from "./types";

type IntegrationsViewProps = {
  integration: GithubIntegration | null;
  onChange: (integration: GithubIntegration | null) => void;
  onAnnouncement: (message: string) => void;
};

function statusLabel(integration: GithubIntegration | null) {
  if (!integration?.configured) return "Not connected";
  if (integration.status === "error" || integration.status === "invalid") return "Connection error";
  if (integration.mode === "paused") return "Paused after canary";
  if (integration.status === "ready") return integration.mode === "canary" ? "Canary ready" : "Connected";
  return integration.status.replaceAll("_", " ");
}

export function IntegrationsView({
  integration,
  onChange,
  onAnnouncement,
}: IntegrationsViewProps) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"save" | "enable" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveAndTest() {
    const value = token.trim();
    if (!value) return;
    setBusy("save");
    setError("");
    try {
      const next = await saveGithubIntegration(value);
      setToken("");
      setConfirmDelete(false);
      onChange(next);
      onAnnouncement("GitHub token saved and repository access verified.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "GitHub could not be verified.");
    } finally {
      setBusy(null);
    }
  }

  async function enableExecution(mode: "canary" | "live") {
    setBusy("enable");
    setError("");
    try {
      const next = await enableGithubIntegration(mode);
      onChange(next);
      onAnnouncement(
        mode === "live"
          ? "Ongoing draft-PR execution enabled. Every website change still needs your approval."
          : "One-PR canary enabled. The next approved website draft can create one draft PR.",
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "GitHub execution could not be enabled.");
    } finally {
      setBusy(null);
    }
  }

  async function removeToken() {
    setBusy("delete");
    setError("");
    try {
      await deleteGithubIntegration();
      setConfirmDelete(false);
      setToken("");
      onChange({
        provider: "github",
        configured: false,
        repository: integration?.repository ?? "denizaytac/ancbuddy-site",
        mode: "disabled",
        status: "not_configured",
      });
      onAnnouncement("GitHub integration removed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The integration could not be removed.");
    } finally {
      setBusy(null);
    }
  }

  const configured = integration?.configured === true;
  const canEnable = configured
    && integration?.status === "ready"
    && (integration.mode === "disabled" || integration.mode === "paused");
  const canEnableLive = integration?.mode === "paused"
    && (integration.succeeded_count ?? 0) >= 1;

  return (
    <section className="ceo-integrations" aria-labelledby="integrations-title">
      <header className="ceo-integrations-heading">
        <div className="ceo-integrations-icon"><GitPullRequest aria-hidden="true" /></div>
        <div>
          <h2 id="integrations-title">GitHub integration</h2>
          <p>One narrowly scoped path from approval to a draft pull request.</p>
        </div>
      </header>

      <div className="ceo-integration-card">
        <div className="ceo-integration-summary">
          <div>
            <strong>Website draft PRs</strong>
            <span className="ceo-integration-status" data-status={configured ? integration?.status : "not_configured"}>
              <span aria-hidden="true" /> {statusLabel(integration)}
            </span>
          </div>
          <dl>
            <div><dt>Repository</dt><dd>{integration?.repository ?? "denizaytac/ancbuddy-site"}</dd></div>
            <div><dt>Mode</dt><dd>{integration?.mode ?? "disabled"}</dd></div>
            <div><dt>Token</dt><dd>{configured ? "Stored securely" : "Not stored"}</dd></div>
          </dl>
        </div>

        <div className="ceo-integration-form">
          <div className="ceo-token-setup">
            <Button asChild type="button" variant="outline">
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                Create fine-grained token on GitHub <ExternalLink />
              </a>
            </Button>
            <ul>
              <li>Repository access: only <strong>denizaytac/ancbuddy-site</strong></li>
              <li>Permissions: Metadata read, Contents read/write, Pull requests read/write</li>
            </ul>
          </div>
          <Field>
            <FieldLabel htmlFor="github-token">Fine-grained personal access token</FieldLabel>
            <div className="ceo-token-field">
              <KeyRound aria-hidden="true" />
              <Input
                id="github-token"
                type="password"
                value={token}
                autoComplete="new-password"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={configured ? "Paste a replacement token" : "github_pat_…"}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            <FieldDescription>
              The token is encrypted after saving and is never shown here again. Scope it only to this repository with Contents and Pull requests read/write.
            </FieldDescription>
          </Field>

          {error ? <p className="ceo-integration-error" role="alert">{error}</p> : null}
          {!error && integration?.last_error ? (
            <p className="ceo-integration-error" role="alert">{integration.last_error}</p>
          ) : null}

          <div className="ceo-integration-actions">
            <Button type="button" variant="approve" disabled={!token.trim() || busy !== null} onClick={() => void saveAndTest()}>
              {busy === "save" ? <LoaderCircle className="ceo-spinning" /> : <ShieldCheck />}
              Save &amp; test
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canEnable || busy !== null}
              onClick={() => void enableExecution(canEnableLive ? "live" : "canary")}
            >
              {busy === "enable" ? <LoaderCircle className="ceo-spinning" /> : integration?.mode === "paused" ? <PauseCircle /> : <CheckCircle2 />}
              {canEnableLive ? "Enable ongoing draft PRs" : "Enable one-PR canary"}
            </Button>
          </div>

          {configured ? (
            <div className="ceo-remove-integration">
              {confirmDelete ? (
                <>
                  <span>Remove the stored token?</span>
                  <Button type="button" variant="destructive" size="sm" disabled={busy !== null} onClick={() => void removeToken()}>
                    {busy === "delete" ? <LoaderCircle className="ceo-spinning" /> : <Trash2 />}
                    Confirm remove
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </>
              ) : (
                <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Remove token
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <p className="ceo-integration-note">
        ANCBuddy can create draft PRs only. There is no merge or publish control in this inbox. After the first canary PR, this integration pauses until you explicitly enable future approved drafts.
      </p>
    </section>
  );
}
