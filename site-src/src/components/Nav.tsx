export function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-brand">
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
        </div>
        <div className="nav-links">
          <a className="nav-link" href="#features">
            Features
          </a>
          <a className="nav-link" href="#how">
            How
          </a>
          <a className="nav-link" href="#devices">
            Devices
          </a>
          <a className="nav-link" href="#pricing">
            Pricing
          </a>
          <a className="nav-link" href="#faq">
            FAQ
          </a>
        </div>
        <a className="nav-cta" href="#pricing">
          Get app
        </a>
      </div>
    </nav>
  );
}
