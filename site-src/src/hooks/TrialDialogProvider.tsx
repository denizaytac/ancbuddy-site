import { useCallback, useMemo, useState, type ReactNode } from "react";
import { TrialDialogContext } from "./trialDialogContext";

export function TrialDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const setDialogOpen = useCallback((next: boolean) => {
    if (next) setShouldMount(true);
    setOpen(next);
  }, []);
  const value = useMemo(
    () => ({ open, shouldMount, setOpen: setDialogOpen }),
    [open, shouldMount, setDialogOpen],
  );

  return (
    <TrialDialogContext.Provider value={value}>
      {children}
    </TrialDialogContext.Provider>
  );
}
