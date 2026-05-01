import { Eyebrow, SectionTitle } from "./Section";

export function How() {
  return (
    <section id="how" className="section container">
      <Eyebrow>How it works</Eyebrow>
      <SectionTitle>
        Three steps. <em>Then forget it exists.</em>
      </SectionTitle>

      <div className="steps">
        <div className="step reveal">
          <span className="step-num">STEP 01</span>
          <h4>Download the DMG</h4>
          <p>
            Notarized, hardened‑runtime, ~2 MB. Drag to Applications. Launch. Grant Bluetooth
            permission once.
          </p>
          <div className="step-mock">
            <div style={{ color: "var(--accent)" }}>$ open ANCBuddy.dmg</div>
            <div>→ codesign --verify — valid</div>
            <div>→ notary check — accepted</div>
          </div>
        </div>
        <div
          className="step reveal"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <span className="step-num">STEP 02</span>
          <h4>Power on your QC Ultras</h4>
          <p>
            ANCBuddy scans for the Bose BMAP service UUID — finds your headphones whether you
            renamed them or not.
          </p>
          <div className="step-mock">
            <div>scanning service 0xFEBE…</div>
            <div style={{ color: "#34d399" }}>found: LE‑Atom (RSSI ‑52)</div>
            <div style={{ color: "var(--fg-4)" }}>connecting…</div>
          </div>
        </div>
        <div
          className="step reveal"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          <span className="step-num">STEP 03</span>
          <h4>Click. Or hotkey. Or both.</h4>
          <p>
            Pick Quiet / Aware / Immersion from the menu — or press ⌃⌥1‑2‑3 from anywhere. The mode
            flips on your headphones in under a second.
          </p>
          <div className="step-mock">
            <div>→ tx 1F.03.00 → QUIET</div>
            <div style={{ color: "#34d399" }}>← ack 0x06 (114 ms)</div>
          </div>
        </div>
      </div>
    </section>
  );
}
