import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    // Vite 8/Rolldown can deadlock when a single CSS bundle is synthesized for
    // multiple HTML entries. Per-entry CSS keeps main, CEO, and purchase builds
    // isolated and lets the normal HTML transform inject each dependency.
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ceo: resolve(__dirname, "ceo/index.html"),
        purchase: resolve(__dirname, "purchase/index.html"),
      },
      output: { manualChunks: undefined },
    },
    target: "es2020",
  },
});
