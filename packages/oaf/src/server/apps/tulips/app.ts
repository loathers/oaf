import cors from "cors";
import express, { type Express } from "express";
import type { ViteDevServer } from "vite";

import { spaFallback } from "../../spaFallback.js";
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
    .get("*path", spaFallback(viteDevServer, "tulips"));

  return app;
}
