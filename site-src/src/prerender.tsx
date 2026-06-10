import { StrictMode } from "react";
import App from "./App";

export async function prerender() {
  const { renderToString } = await import("react-dom/server");

  return {
    html: renderToString(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  };
}
