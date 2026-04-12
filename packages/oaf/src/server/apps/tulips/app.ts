import cors from "cors";
import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import type { ViteDevServer } from "vite";

import { pricesRouter } from "./routes/prices.js";

export function createTulipsApp(viteDevServer: ViteDevServer | null): Express {
  const app = express();

  app
    .use(cors())
    .use(
      viteDevServer
        ? viteDevServer.middlewares
        : express.static("build/client/tulips"),
    )
    .get("/favicon.ico", (_req, res) => void res.send())
    .use("/api/prices", pricesRouter)
    // SPA fallback
    .get("*path", async (req, res) => {
      if (viteDevServer) {
        const html = fs.readFileSync(
          path.resolve("src/server/apps/tulips/web/index.html"),
          "utf-8",
        );
        const transformed = await viteDevServer.transformIndexHtml(
          req.url,
          html,
        );
        res.set("Content-Type", "text/html").send(transformed);
      } else {
        res.sendFile(path.resolve("build/client/tulips/index.html"));
      }
    });

  return app;
}
