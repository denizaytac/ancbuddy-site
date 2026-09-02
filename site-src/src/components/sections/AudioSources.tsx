import { Icon } from "../Icon";
import { Eyebrow, SectionLede, SectionTitle } from "./Section";

const SOURCE_PROOFS = [
  "See the active source",
  "See other connected sources",
  "Switch to a remembered device",
  "Start pairing from ANCBuddy",
];

export function AudioSources() {
  return (
    <section id="audio-sources" className="section container audio-sources-section">
      <div className="audio-sources-heading">
        <Eyebrow>Audio Sources</Eyebrow>
        <SectionTitle>
          Your Bose audio sources, <em>from the Mac menu bar.</em>
        </SectionTitle>
        <SectionLede>
          ANCBuddy 2.2.0 shows what is actively streaming, what else is connected, and
          which devices your Bose QC Ultra remembers.
        </SectionLede>
      </div>

      <div className="audio-sources-layout">
        <figure className="audio-sources-media reveal">
          <picture>
            <source type="image/avif" srcSet="/ancbuddy-audio-sources-mac.avif" />
            <source type="image/webp" srcSet="/ancbuddy-audio-sources-mac.webp" />
            <img
              src="/ancbuddy-audio-sources-mac.png"
              alt="ANCBuddy Audio Sources panel showing the active Bose QC Ultra source, another connected source, and remembered devices on Mac"
              width="672"
              height="1604"
              loading="lazy"
              decoding="async"
            />
          </picture>
          <figcaption>Real ANCBuddy 2.2.0 panel · privacy-safe device labels</figcaption>
        </figure>

        <div className="audio-sources-proof reveal">
          <ul className="audio-sources-proof-list">
            {SOURCE_PROOFS.map((proof) => (
              <li className="audio-source-proof" key={proof}>
                <span className="audio-source-proof-icon" aria-hidden="true">
                  <Icon name="check" size={15} />
                </span>
                <span>{proof}</span>
              </li>
            ))}
          </ul>

          <p className="audio-sources-boundary">
            ANCBuddy works with sources remembered by your Bose QC Ultra. It does not
            provide a Multipoint on/off toggle or manage arbitrary Bluetooth devices.
          </p>

          <a className="btn btn-ghost audio-sources-link" href="/switch-bose-qc-ultra-audio-sources-mac.html">
            Learn how audio-source switching works
            <Icon name="arrow" size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
