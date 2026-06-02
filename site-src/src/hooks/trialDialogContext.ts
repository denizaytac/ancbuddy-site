import { createContext } from "react";

export interface TrialDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const TrialDialogContext = createContext<TrialDialogState | null>(null);
