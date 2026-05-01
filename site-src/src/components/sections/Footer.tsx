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
              A tiny menu‑bar app for Bose QC Ultra. Made in Berlin by Deniz Aytaç.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <a href="https://github.com/denizaytac/ancbuddy-site">GitHub</a>
            <a href="https://github.com/denizaytac/ancbuddy-site/blob/main/CHANGELOG.md">
              Changelog
            </a>
            <button onClick={() => openTrial(true)}>Free trial</button>
            <a href="mailto:denoaytac62@gmail.com">Contact</a>
          </div>
          <div className="footer-col">
            <h5>Legal</h5>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Refund policy</a>
          </div>
        </div>

        <div className="disclaimer">
          ANCBuddy is an independent project and is not affiliated with, endorsed by, or sponsored
          by Bose Corporation. Bose, QuietComfort, QC Ultra, and related marks are trademarks of
          Bose Corporation, used here only to describe compatible hardware.
        </div>

        <div className="footer-bottom">
          <span>© 2026 Deniz Aytaç · ANCBuddy v1.2.0</span>
          <span>Built with Swift · Hosted on GitHub Pages</span>
        </div>
      </div>
    </footer>
  );
}
