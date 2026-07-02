import { useTrialDialog } from "@/hooks/useTrialDialog";

export function Footer() {
  const { setOpen: openTrial } = useTrialDialog();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="nav-brand" style={{ marginBottom: 16 }}>
              <img className="footer-logo" src="/logo.png" alt="ANCBuddy" />
              ANCBuddy
            </div>
            <p
              style={{
                margin: 0,
                color: "var(--fg-3)",
                fontSize: 14,
                lineHeight: 1.5,
                maxWidth: "36ch",
              }}
            >
              A tiny menu‑bar app for Bose QC Ultra, built for quick Mac control.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <a href="#features">Features</a>
            <a href="#devices">Devices</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <a href="/control-bose-qc-ultra-from-mac.html">Mac control guide</a>
            <a href="/changelog.html">Changelog</a>
            <button onClick={() => openTrial(true)}>Free trial</button>
            <a href="mailto:denoaytac62@gmail.com">Contact</a>
          </div>
        </div>

        <div className="disclaimer">
          ANCBuddy is an independent project and is not affiliated with, endorsed by, or sponsored
          by Bose Corporation. Bose, QuietComfort, QC Ultra, and related marks are trademarks of
          Bose Corporation, used here only to describe compatible hardware.
        </div>

        <div className="footer-bottom">
          <span>© 2026 ANCBuddy · v2.0.2</span>
          <span>Independent utility for compatible Bose hardware</span>
        </div>
      </div>
    </footer>
  );
}
