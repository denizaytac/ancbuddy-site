import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CeoInbox } from "./ceo/CeoInbox";
import "./styles/globals.css";
import "./styles/ceo.css";

const root = document.getElementById("ceo-root");
if (!root) throw new Error("CEO Inbox root element not found");

createRoot(root).render(
  <StrictMode>
    <CeoInbox />
  </StrictMode>,
);
