import { Icon } from "../Icon";
import { Eyebrow, SectionTitle, SectionLede } from "./Section";
import facts from "../../../content/product-facts.json";

export function Devices() {
  return (
    <section id="devices" className="section container">
      <Eyebrow>Supported hardware</Eyebrow>
      <SectionTitle>
        Made for <em>Bose QC Ultra.</em>
      </SectionTitle>
      <SectionLede>
        ANCBuddy brings modes, battery, and remembered audio sources to the supported
        Bose QC Ultra models below.
      </SectionLede>

      <div className="devices">
        <div className="device reveal">
          <div className="device-art">
            <Icon name="headphones" size={52} />
          </div>
          <div>
            <h3>
              <a href="/bose-qc-ultra-mac-app.html">QC Ultra Headphones — Gen 1</a>
            </h3>
            <div className="device-meta">Modes, battery, remembered audio sources</div>
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
            <h3>
              <a href="/qc-ultra-headphones-gen-2-mac.html">QC Ultra Headphones — Gen 2</a>
            </h3>
            <div className="device-meta">Modes, battery, remembered audio sources</div>
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
            <h3>
              <a href="/qc-ultra-earbuds-2nd-gen-mac.html">QC Ultra Earbuds — 2nd Gen</a>
            </h3>
            <div className="device-meta">Modes, battery, remembered audio sources</div>
          </div>
          <span className="device-status">Supported</span>
        </div>
      </div>

      <p className="device-note reveal" style={{ "--reveal-delay": "300ms" } as React.CSSProperties}>
        Want ANCBuddy for another Bose model?{" "}
        <a href={`mailto:${facts.supportEmail}?subject=ANCBuddy%20headphone%20request`}>
          Send a note.
        </a>
      </p>
    </section>
  );
}
