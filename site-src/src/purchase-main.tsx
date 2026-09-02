import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import "./purchase/purchase.css";
import { PurchaseFeedback } from "./purchase/PurchaseFeedback";

const root = document.getElementById("purchase-root");
if (!root) throw new Error("Purchase root element not found");

createRoot(root).render(
  <StrictMode>
    <PurchaseFeedback />
  </StrictMode>,
);
