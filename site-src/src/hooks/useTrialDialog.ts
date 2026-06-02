import { useContext } from "react";
import { TrialDialogContext } from "./trialDialogContext";

export function useTrialDialog() {
  const ctx = useContext(TrialDialogContext);
  if (!ctx) throw new Error("useTrialDialog must be used inside TrialDialogProvider");
  return ctx;
}
