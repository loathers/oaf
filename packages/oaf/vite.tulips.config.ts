import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "warn",
  clearScreen: false,
  cacheDir: "node_modules/.vite-tulips",
  root: "src/server/apps/tulips/web",
  server: { hmr: { port: 24680 } },
  build: {
    outDir: "../../../../../build/client/tulips",
    emptyOutDir: true,
  },
  plugins: [react()],
});
