import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrialDialog } from "@/hooks/useTrialDialog";
import {
  DMG_URL,
  getAttributionPayload,
  insertSupabaseRow,
  trackSiteEvent,
} from "@/lib/attribution";
import { Icon } from "./Icon";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const SUBMIT_TIMEOUT_MS = 8000;

type Status = "idle" | "submitting" | "success";

async function notifyTrialSignupByEmail(name: string, email: string) {
  if (!WEB3FORMS_KEY) {
    console.warn("Trial signup: Web3Forms key is not configured");
    return;
  }

  try {
    const body = new FormData();
    body.append("access_key", WEB3FORMS_KEY);
    body.append("name", name);
    body.append("email", email);
    body.append("subject", "New ANCBuddy Trial Signup");
    body.append("from_name", "ANCBuddy Trial Form");
    body.append("botcheck", "");

    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
      keepalive: true,
    });

    if (!res.ok) throw new Error(`Web3Forms HTTP ${res.status}`);
    const json = (await res.json()) as { success?: boolean; message?: string };
    if (!json.success) {
      throw new Error(json.message ?? "Web3Forms rejected submission");
    }
  } catch (error) {
    console.warn("Trial signup: Web3Forms notification failed", error);
  }
}

export function TrialDialog() {
  const { open, setOpen } = useTrialDialog();
  const [status, setStatus] = useState<Status>("idle");
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      trackSiteEvent("trial_open");
    }
    wasOpen.current = open;
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset to the form view after the close animation so users see
      // the normal dialog when they reopen, not a stale success state.
      window.setTimeout(() => setStatus("idle"), 300);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = (formData.get("name") ?? "").toString().trim();
    const email = (formData.get("email") ?? "").toString().trim();
    const honey = (formData.get("_honey") ?? "").toString();

    if (honey) return;
    if (!name || !email) {
      form.reportValidity();
      return;
    }

    setStatus("submitting");
    void notifyTrialSignupByEmail(name, email);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      SUBMIT_TIMEOUT_MS,
    );
    const attribution = getAttributionPayload();

    try {
      await insertSupabaseRow(
        "trial_signups",
        {
          name,
          email,
          ...attribution,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        },
        { signal: controller.signal },
      );
    } catch (error) {
      console.warn("Trial signup: Supabase insert failed; allowing direct download", error);
    } finally {
      window.clearTimeout(timeoutId);
    }

    trackSiteEvent("trial_start");
    trackSiteEvent("download_click", { placement: "trial_submit_auto" });
    setStatus("success");
    // Trigger the DMG download. In most browsers this starts the
    // download without navigating away, so we keep the dialog open
    // showing a confirmation + a manual download link.
    window.location.href = DMG_URL;
  }

  function handleSkip() {
    if (status === "submitting") return;
    // Honest event split: a skip is a download, not a trial signup.
    trackSiteEvent("download_click", { placement: "trial_skip" });
    setStatus("success");
    window.location.href = DMG_URL;
  }

  const isSubmitting = status === "submitting";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="trial-dialog">
        {status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Download started — check your Mac</DialogTitle>
              <DialogDescription>
                If the download didn't begin automatically, click the button
                below to grab the DMG directly.
              </DialogDescription>
            </DialogHeader>

            <a
              href={DMG_URL}
              className="btn btn-accent"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 16,
              }}
              onClick={() => {
                trackSiteEvent("download_click", { placement: "trial_success" });
                setOpen(false);
              }}
            >
              <Icon name="bolt" size={15} />
              Download ANCBuddy
            </a>

            <p className="trial-fineprint">
              14‑day trial · then $9.99 to keep using.
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Try ANCBuddy free for 14 days</DialogTitle>
              <DialogDescription>
                Download the DMG right away — or leave your email first for
                setup tips and a trial-end reminder. No spam, unsubscribe
                anytime.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="trial-form">
              <div>
                <label htmlFor="trial-name">Name</label>
                <input
                  type="text"
                  id="trial-name"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="trial-email">Email</label>
                <input
                  type="email"
                  id="trial-email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>

              <input
                type="text"
                name="_honey"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -9999,
                  width: 1,
                  height: 1,
                }}
              />

              <button
                type="submit"
                className="btn btn-accent"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 8,
                }}
                disabled={isSubmitting}
              >
                <Icon name="bolt" size={15} />
                {isSubmitting ? "Starting…" : "Get the download"}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-ghost"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 10,
              }}
              disabled={isSubmitting}
              onClick={handleSkip}
            >
              Skip — just download the trial
            </button>

            <p className="trial-fineprint">
              If you leave your email, you agree to receive occasional product
              updates.
              <br />
              14‑day trial · then $9.99 to keep using.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
