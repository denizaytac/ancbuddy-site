import { createContext, useContext, useState, type ReactNode } from "react";

interface TrialDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TrialDialogContext = createContext<TrialDialogState | null>(null);

export function TrialDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <TrialDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </TrialDialogContext.Provider>
  );
}

export function useTrialDialog() {
  const ctx = useContext(TrialDialogContext);
  if (!ctx) throw new Error("useTrialDialog must be used inside TrialDialogProvider");
  return ctx;
}
