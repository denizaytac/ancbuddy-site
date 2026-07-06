import { Icon } from "../Icon";
import { Eyebrow, SectionTitle } from "./Section";
import { FAQ_ITEMS } from "@/data/faq";

export function FAQ() {
  return (
    <section id="faq" className="section container">
      <Eyebrow>Frequently asked</Eyebrow>
      <SectionTitle>
        Questions, <em>answered.</em>
      </SectionTitle>

      <div className="faq">
        {FAQ_ITEMS.map((it, i) => (
          <details key={i} className="faq-item" open>
            <summary className="faq-q">
              <span>{it.q}</span>
              <span className="faq-q-icon">
                <Icon name="plus" size={14} />
              </span>
            </summary>
            <div className="faq-a-inner">{it.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
