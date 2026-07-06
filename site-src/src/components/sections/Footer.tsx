import { useTrialDialog } from "@/hooks/useTrialDialog";

export function Footer() {
  const { setOpen: openTrial } = useTrialDialog();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="nav-brand" style={{ marginBottom: 16 }}>
              <picture className="footer-logo-picture">
                <source
                  type="image/avif"
                  srcSet="/logo-40.avif 40w, /logo-80.avif 80w"
                  sizes="28px"
                />
                <source
                  type="image/webp"
                  srcSet="/logo-40.webp 40w, /logo-80.webp 80w"
                  sizes="28px"
                />
                <img
                  className="footer-logo"
                  src="/logo-40.png"
                  srcSet="/logo-40.png 40w, /logo-80.png 80w"
                  sizes="28px"
                  alt="ANCBuddy"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
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
            <div className="footer-heading">Product</div>
            <a href="#features">Features</a>
            <a href="#devices">Devices</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <div className="footer-heading">Resources</div>
            <a href="/guides.html">Guides</a>
            <a href="/control-bose-qc-ultra-from-mac.html">Mac control guide</a>
            <a href="/support.html">Support</a>
            <a href="/privacy.html">Privacy</a>
            <a href="/facts.html">Facts</a>
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
