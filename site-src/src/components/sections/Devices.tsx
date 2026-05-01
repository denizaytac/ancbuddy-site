import { Icon } from "../Icon";
import { Eyebrow, SectionTitle, SectionLede } from "./Section";

export function Devices() {
  return (
    <section id="devices" className="section container">
      <Eyebrow>Supported hardware</Eyebrow>
      <SectionTitle>
        Every Bose with a <em>FEBE service.</em>
      </SectionTitle>
      <SectionLede>
        Detected by Bluetooth service UUID, not by name — so renamed headphones still work.
      </SectionLede>

      <div className="devices">
        <div className="device reveal">
          <div className="device-art">
            <div>
              <Icon name="headphones" size={40} />
              <div style={{ marginTop: 8 }}>[ QC Ultra Headphones · render placeholder ]</div>
            </div>
          </div>
          <div>
            <h4>QC Ultra Headphones — Gen 1</h4>
            <div className="device-meta">BLE name: LE‑Atom · Company ID 0x009E</div>
          </div>
          <span className="device-status">Tested daily</span>
        </div>

        <div
          className="device reveal"
          style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
        >
          <div className="device-art">
            <div>
              <Icon name="headphones" size={40} />
              <div style={{ marginTop: 8 }}>[ QC Ultra Headphones Gen 2 · render placeholder ]</div>
            </div>
          </div>
          <div>
            <h4>QC Ultra Headphones — Gen 2</h4>
            <div className="device-meta">Confirmed by beta testers · April 2026</div>
          </div>
          <span className="device-status">Confirmed</span>
        </div>

        <div
          className="device reveal"
          style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
        >
          <div className="device-art">
            <div>
              <Icon name="earbud" size={40} />
              <div style={{ marginTop: 8 }}>[ QC Ultra Earbuds 2nd Gen · render placeholder ]</div>
            </div>
          </div>
          <div>
            <h4>QC Ultra Earbuds — 2nd Gen</h4>
            <div className="device-meta">Confirmed by tofu79 / r/bose · March 2026</div>
          </div>
          <span className="device-status">Confirmed</span>
        </div>
      </div>
    </section>
  );
}
