import cors from "cors";
import express, { type Express } from "express";
import type { ViteDevServer } from "vite";

import { spaFallback } from "../../spaFallback.js";
import { calendarRouter } from "./routes/calendar.js";

export function createCalendarApp(
  viteDevServer: ViteDevServer | null,
): Express {
  const app = express();

  app
    .use(cors())
    .use(
      viteDevServer
        ? viteDevServer.middlewares
        : express.static("build/client/calendar"),
    )
    .get("/favicon.ico", (_req, res) => void res.send())
    .use("/api/calendar", calendarRouter)
    // SPA fallback
    .get("*path", spaFallback(viteDevServer, "calendar"));

  return app;
}
