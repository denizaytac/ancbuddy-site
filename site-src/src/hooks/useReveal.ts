import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.getAttribute("data-motion") === "off") return;

    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    const init = () => {
      if (cancelled) return;
      const seen = new WeakSet<Element>();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              requestAnimationFrame(() => e.target.removeAttribute("data-pending"));
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px -8% 0px" },
      );

      const arm = () => {
        document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          el.setAttribute("data-pending", "");
          io?.observe(el);
        });
      };

      arm();
      mo = new MutationObserver(arm);
      mo.observe(document.body, { childList: true, subtree: true });
    };

    const usingIdleCallback = Boolean(window.requestIdleCallback);
    const idleId = usingIdleCallback
      ? window.requestIdleCallback(init, { timeout: 1200 })
      : window.setTimeout(init, 400);

    return () => {
      cancelled = true;
      if (usingIdleCallback) window.cancelIdleCallback?.(idleId);
      else window.clearTimeout(idleId);
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);
}
