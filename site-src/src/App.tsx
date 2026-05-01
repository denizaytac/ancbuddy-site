import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { TrialDialog } from "./components/TrialDialog";
import { TrialDialogProvider } from "./hooks/useTrialDialog";
import { useReveal } from "./hooks/useReveal";
import { Problem } from "./components/sections/Problem";
import { Features } from "./components/sections/Features";
import { Quotes } from "./components/sections/Quotes";
import { How } from "./components/sections/How";
import { Devices } from "./components/sections/Devices";
import { Pricing } from "./components/sections/Pricing";
import { FAQ } from "./components/sections/FAQ";
import { CTA } from "./components/sections/CTA";
import { Footer } from "./components/sections/Footer";

function AppShell() {
  useReveal();

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
        <How />
        <Devices />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <Footer />
      <TrialDialog />
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
