import { createContext } from "react";

export interface TrialDialogState {
  open: boolean;
  shouldMount: boolean;
  setOpen: (open: boolean) => void;
}

export const TrialDialogContext = createContext<TrialDialogState | null>(null);
