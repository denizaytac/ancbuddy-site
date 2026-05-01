import type { ReactNode } from "react";

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="section-eyebrow reveal">{children}</div>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="section-title reveal">{children}</h2>
);

export const SectionLede = ({ children }: { children: ReactNode }) => (
  <p className="section-lede reveal">{children}</p>
);
