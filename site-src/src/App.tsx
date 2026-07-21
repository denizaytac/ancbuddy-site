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

const TrialDialog = lazy(() =>
  import("./components/TrialDialog").then((module) => ({
    default: module.TrialDialog,
  })),
);

function AppShell() {
  useReveal();
  const { shouldMount, setOpen: openTrial } = useTrialDialog();

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    function syncTrialHash() {
      if (window.location.hash === "#trial") {
        openTrial(true);
      }
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
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <Footer />
      {shouldMount && (
        <Suspense fallback={null}>
          <TrialDialog />
        </Suspense>
      )}
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
