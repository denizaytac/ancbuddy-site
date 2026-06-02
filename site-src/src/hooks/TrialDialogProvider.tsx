import { useState, type ReactNode } from "react";
import { TrialDialogContext } from "./trialDialogContext";

export function TrialDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TrialDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </TrialDialogContext.Provider>
  );
}
