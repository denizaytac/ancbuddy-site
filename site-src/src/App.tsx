import { lazy, Suspense, useEffect } from "react";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { TrialDialogProvider } from "./hooks/TrialDialogProvider";
import { useTrialDialog } from "./hooks/useTrialDialog";
import { useReveal } from "./hooks/useReveal";
import { trackPageView } from "./lib/attribution";
import { Problem } from "./components/sections/Problem";
import { Features } from "./components/sections/Features";
import { Quotes } from "./components/sections/Quotes";
import { Devices } from "./components/sections/Devices";
import { Pricing } from "./components/sections/Pricing";
import { FAQ } from "./components/sections/FAQ";
import { CTA } from "./components/sections/CTA";
import { Footer } from "./components/sections/Footer";

const TrialDialog = __COMMERCIAL_MODE__ === "active"
  ? lazy(() =>
      import("./components/TrialDialog").then((module) => ({
        default: module.TrialDialog,
      })),
    )
  : null;

function AppShell() {
  useReveal();
  const { shouldMount, setOpen: openTrial } = useTrialDialog();

  useEffect(() => {
    if (__COMMERCIAL_MODE__ === "active") trackPageView();
  }, []);

  useEffect(() => {
    function syncTrialHash() {
      if (__COMMERCIAL_MODE__ === "active" && window.location.hash === "#trial") {
        openTrial(true);
        return;
      }

      if (__COMMERCIAL_MODE__ === "active") return;

      const redirects: Record<string, string> = {
        "#trial": "#features",
        "#pricing": "#devices",
      };
      const destination = redirects[window.location.hash];
      if (!destination) return;

      window.history.replaceState(null, "", destination);
      window.requestAnimationFrame(() => {
        document.querySelector(destination)?.scrollIntoView();
      });
    }

    syncTrialHash();
    window.addEventListener("hashchange", syncTrialHash);
    return () => window.removeEventListener("hashchange", syncTrialHash);
  }, [openTrial]);

  return (
    <>
      <div className="page-bg" />
      <div className="grid-overlay" />

      <Nav />

      <main>
        <Hero />
        <Problem />
        <Features />
        <Quotes />
        <Devices />
        {__COMMERCIAL_MODE__ === "active" ? <Pricing /> : null}
        <FAQ />
        <CTA />
      </main>

      <Footer />
      {__COMMERCIAL_MODE__ === "active" && shouldMount && TrialDialog ? (
        <Suspense fallback={null}>
          <TrialDialog />
        </Suspense>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <TrialDialogProvider>
      <AppShell />
    </TrialDialogProvider>
  );
}
