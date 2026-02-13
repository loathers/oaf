import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "warn",
  clearScreen: false,
  root: "src/server/web",
  build: {
    outDir: "../../../build/client",
    emptyOutDir: true,
  },
  plugins: [react()],
});
