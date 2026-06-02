import { Icon } from "../Icon";
import { Eyebrow, SectionTitle, SectionLede } from "./Section";

export function Devices() {
  return (
    <section id="devices" className="section container">
      <Eyebrow>Supported hardware</Eyebrow>
      <SectionTitle>
        Made for <em>Bose QC Ultra.</em>
      </SectionTitle>
      <SectionLede>
        ANCBuddy currently supports the Bose QC Ultra models below.
      </SectionLede>

      <div className="devices">
        <div className="device reveal">
          <div className="device-art">
            <Icon name="headphones" size={52} />
          </div>
          <div>
            <h4>QC Ultra Headphones — Gen 1</h4>
            <div className="device-meta">Quiet, Aware, Immersion + AI Auto‑EQ</div>
          </div>
          <span className="device-status">Supported</span>
        </div>

        <div
          className="device reveal"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <div className="device-art">
            <Icon name="headphones" size={52} />
          </div>
          <div>
            <h4>QC Ultra Headphones — Gen 2</h4>
            <div className="device-meta">Quiet, Aware, Immersion + AI Auto‑EQ</div>
          </div>
          <span className="device-status">Supported</span>
        </div>

        <div
          className="device reveal"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          <div className="device-art">
            <Icon name="earbud" size={52} />
          </div>
          <div>
            <h4>QC Ultra Earbuds — 2nd Gen</h4>
            <div className="device-meta">Quiet, Aware, Immersion + AI Auto‑EQ</div>
          </div>
          <span className="device-status">Supported</span>
        </div>
      </div>

      <p className="device-note reveal" style={{ "--reveal-delay": "300ms" } as React.CSSProperties}>
        Want ANCBuddy for another Bose model?{" "}
        <a href="mailto:denoaytac62@gmail.com?subject=ANCBuddy%20headphone%20request">
          Send a note.
        </a>
      </p>
    </section>
  );
}
