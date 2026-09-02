import { useEffect, useRef, useState } from "react";
import { trackPageView, trackSiteEvent } from "../lib/attribution";

const ORDER_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://wryaxqkfpphtzbskfjgi.supabase.co";
const FEEDBACK_ENDPOINT =
  `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/purchase-attribution-feedback`;
const PENDING_RETRY_DELAYS_MS = [0, 1500, 3000, 5000];

const SOURCE_OPTIONS = [
  { value: "reddit_forum", label: "Reddit or another forum" },
  { value: "google", label: "Google or another search engine" },
  { value: "chatgpt_ai", label: "ChatGPT or another AI assistant" },
  { value: "github", label: "GitHub" },
  { value: "listing", label: "An app listing or directory" },
  { value: "recommendation", label: "A friend or recommendation" },
  { value: "social_video", label: "Social media or a video" },
  { value: "other", label: "Somewhere else" },
  { value: "unknown", label: "I don't remember" },
] as const;

type Source = (typeof SOURCE_OPTIONS)[number]["value"];
type Status = "ready" | "submitting" | "success" | "skipped" | "error";

function readOrderIdentifier() {
  const value = new URLSearchParams(window.location.search).get("order_identifier") ?? "";
  return ORDER_IDENTIFIER_PATTERN.test(value) ? value.toLowerCase() : null;
}

function removeOrderIdentifierFromAddressBar() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("order_identifier")) return;
  url.searchParams.delete("order_identifier");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function submitFeedback(orderIdentifier: string, source: Source) {
  for (const delay of PENDING_RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    const response = await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_identifier: orderIdentifier, source }),
    });

    if (response.ok && response.status !== 202) return;
    if (response.status !== 202) {
      throw new Error(`Purchase feedback failed: HTTP ${response.status}`);
    }
  }
  throw new Error("Purchase feedback order is still pending");
}

export function PurchaseFeedback() {
  const [orderIdentifier] = useState(readOrderIdentifier);
  const [status, setStatus] = useState<Status>("ready");
  const shownTracked = useRef(false);

  useEffect(() => {
    removeOrderIdentifierFromAddressBar();
    // Strip the bearer token before attribution reads the current URL. It must
    // never enter site_events, referrers, or stored first/last-touch paths.
    trackPageView();
    if (orderIdentifier && !shownTracked.current) {
      shownTracked.current = true;
      trackSiteEvent("purchase_feedback_shown", { has_order_identifier: true });
    }
  }, [orderIdentifier]);

  async function chooseSource(source: Source) {
    if (!orderIdentifier || status === "submitting") return;
    setStatus("submitting");
    try {
      await submitFeedback(orderIdentifier, source);
      trackSiteEvent("purchase_feedback_submitted", { source });
      setStatus("success");
    } catch (error) {
      console.warn("Purchase feedback submission failed", error);
      setStatus("error");
    }
  }

  function skip() {
    if (status === "submitting") return;
    trackSiteEvent("purchase_feedback_skipped");
    setStatus("skipped");
  }

  const finished = status === "success" || status === "skipped";

  return (
    <main className="purchase-shell">
      <div className="purchase-orb purchase-orb-left" />
      <div className="purchase-orb purchase-orb-right" />
      <section className="purchase-card" aria-labelledby="purchase-title">
        <a className="purchase-brand" href="/" aria-label="ANCBuddy home">
          <img src="/logo-80.webp" width="42" height="42" alt="" />
          <span>ANCBuddy</span>
        </a>

        {finished ? (
          <div className="purchase-result" role="status">
            <div className="purchase-check" aria-hidden="true">✓</div>
            <h1 id="purchase-title">
              {status === "success" ? "Thanks — that helps a lot." : "You're all set."}
            </h1>
            <p>
              Your purchase, license, receipt, and download are independent of this optional answer.
            </p>
            <a className="purchase-primary" href="/">Back to ANCBuddy</a>
          </div>
        ) : !orderIdentifier ? (
          <div className="purchase-result" role="status">
            <h1 id="purchase-title">Thanks for supporting ANCBuddy.</h1>
            <p>
              The private order reference is missing, so there is nothing to submit. Your purchase is unaffected.
            </p>
            <a className="purchase-primary" href="/">Back to ANCBuddy</a>
          </div>
        ) : (
          <>
            <h1 id="purchase-title">Where did you first discover ANCBuddy?</h1>
            <p className="purchase-intro">
              One anonymous answer helps a tiny Mac app find the right communities. No email, name, license key, or free text is collected here.
            </p>

            <div className="purchase-options" aria-label="Discovery source">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void chooseSource(option.value)}
                  disabled={status === "submitting"}
                >
                  <span>{option.label}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>

            {status === "submitting" && (
              <p className="purchase-status" role="status">Saving your answer…</p>
            )}
            {status === "error" && (
              <p className="purchase-status purchase-error" role="alert">
                That did not save. Your purchase is unaffected — try once more or skip.
              </p>
            )}

            <button
              className="purchase-skip"
              type="button"
              onClick={skip}
              disabled={status === "submitting"}
            >
              Skip this question
            </button>
          </>
        )}

        <p className="purchase-privacy">
          The order reference is removed from the address bar and used only to confirm a valid order. See the <a href="/privacy.html">privacy note</a>.
        </p>
      </section>
    </main>
  );
}
