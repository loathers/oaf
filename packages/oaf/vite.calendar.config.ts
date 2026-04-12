import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "warn",
  clearScreen: false,
  root: "src/server/apps/calendar/web",
  build: {
    outDir: "../../../../../build/client/calendar",
    emptyOutDir: true,
  },
  server: { hmr: { port: 24679 } },
  plugins: [react()],
});
