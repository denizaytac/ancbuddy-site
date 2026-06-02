import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrialDialog } from "@/hooks/useTrialDialog";
import { supabase } from "@/lib/supabase";
import { Icon } from "./Icon";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const DMG_URL =
  "https://github.com/denizaytac/ancbuddy-site/releases/download/v2.0.2/ANCBuddy-2.0.2.dmg";
const SUBMIT_TIMEOUT_MS = 8000;

type Status = "idle" | "submitting" | "success";

async function notifyTrialSignupByEmail(name: string, email: string) {
  if (!WEB3FORMS_KEY) {
    console.warn("Trial signup: Web3Forms key is not configured");
    return;
  }

  try {
    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        name,
        email,
        subject: "New ANCBuddy Trial Signup",
        from_name: "ANCBuddy Trial Form",
        botcheck: "",
      }),
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

    const formData = new FormData(event.currentTarget);
    const name = (formData.get("name") ?? "").toString().trim();
    const email = (formData.get("email") ?? "").toString().trim();
    const honey = (formData.get("_honey") ?? "").toString();

    if (honey) return;
    if (!name || !email) return;

    setStatus("submitting");
    void notifyTrialSignupByEmail(name, email);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      SUBMIT_TIMEOUT_MS,
    );

    try {
      if (!supabase) throw new Error("Supabase client is not configured");

      await supabase
        .from("trial_signups")
        .insert({
          name,
          email,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .abortSignal(controller.signal)
        .then((res) => {
          if (res.error) throw res.error;
          return res;
        });
    } catch (error) {
      console.warn("Trial signup: Supabase insert failed; allowing direct download", error);
    } finally {
      window.clearTimeout(timeoutId);
    }

    setStatus("success");
    // Trigger the DMG download. In most browsers this starts the
    // download without navigating away, so we keep the dialog open
    // showing a confirmation + a manual download link.
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
              onClick={() => setOpen(false)}
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
                Drop your details to start the DMG download. No spam —
                unsubscribe anytime.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="trial-form" noValidate>
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

            <p className="trial-fineprint">
              By downloading you agree to receive occasional product updates.
              <br />
              14‑day trial · then $9.99 to keep using.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
