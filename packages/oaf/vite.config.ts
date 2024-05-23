import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "warn",
  clearScreen: false,
  plugins: [
    remix({
      appDirectory: "src/server/web",
    }),
  ],
});
