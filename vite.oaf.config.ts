import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "warn",
  clearScreen: false,
  cacheDir: "node_modules/.vite-oaf",
  root: "src/server/apps/oaf/web",
  build: {
    outDir: "../../../../../build/client/oaf",
    emptyOutDir: true,
  },
  server: { hmr: { port: 24678 } },
  plugins: [react()],
});
