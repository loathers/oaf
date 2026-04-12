import cors from "cors";
import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import type { ViteDevServer } from "vite";

import { calendarRouter } from "./api/calendar.js";

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
    .get("*path", async (req, res) => {
      if (viteDevServer) {
        const html = fs.readFileSync(
          path.resolve("src/server/apps/calendar/web/index.html"),
          "utf-8",
        );
        const transformed = await viteDevServer.transformIndexHtml(
          req.url,
          html,
        );
        res.set("Content-Type", "text/html").send(transformed);
      } else {
        res.sendFile(path.resolve("build/client/calendar/index.html"));
      }
    });

  return app;
}
