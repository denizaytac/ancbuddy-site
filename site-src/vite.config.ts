import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const commercialModeConfig = JSON.parse(
  readFileSync(new URL("./src/config/commercial-mode.json", import.meta.url), "utf8"),
) as { commercialMode: "active" | "paused" };

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMERCIAL_MODE__: JSON.stringify(commercialModeConfig.commercialMode),
  },
  base: "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ceo: resolve(__dirname, "ceo/index.html"),
      },
      output: { manualChunks: undefined },
    },
    target: "es2020",
  },
});
