import type { MouseEvent } from "react";
import { useTrialDialog } from "@/hooks/useTrialDialog";

export function Nav() {
  const { setOpen: openTrial } = useTrialDialog();

  function handleTrialClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.history.replaceState(null, "", "#trial");
    openTrial(true);
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href="/">
          <span className="nav-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12 a7 7 0 0 1 14 0"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <rect x="3" y="11" width="4.6" height="7" rx="2" fill="currentColor" />
              <rect x="16.4" y="11" width="4.6" height="7" rx="2" fill="currentColor" />
              <circle cx="9.5" cy="14.5" r="1.15" fill="var(--bg)" />
              <circle cx="14.5" cy="14.5" r="1.15" fill="var(--bg)" />
            </svg>
          </span>
          ANCBuddy
        </a>
        <div className="nav-links">
          <a className="nav-link" href="#features">
            Features
          </a>
          <a className="nav-link" href="#devices">
            Devices
          </a>
          <a className="nav-link" href="/guides.html">
            Guides
          </a>
          {__COMMERCIAL_MODE__ === "active" ? (
            <a className="nav-link" href="#pricing">
              Pricing
            </a>
          ) : (
            <a className="nav-link" href="#faq">
              FAQ
            </a>
          )}
        </div>
        {__COMMERCIAL_MODE__ === "active" ? (
          <a className="nav-cta" href="#trial" onClick={handleTrialClick}>
            Try 14 days for free
          </a>
        ) : (
          <a className="nav-cta" href="#features">
            Explore features
          </a>
        )}
      </div>
    </nav>
  );
}
