import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

      <Accordion type="single" collapsible defaultValue="item-0" className="faq">
        {FAQ_ITEMS.map((it, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="faq-item">
            <AccordionTrigger className="faq-q">
              <span>{it.q}</span>
              <span className="faq-q-icon">
                <Icon name="plus" size={14} />
              </span>
            </AccordionTrigger>
            <AccordionContent className="faq-a-inner">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
