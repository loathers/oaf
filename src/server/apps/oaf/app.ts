import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import type { ViteDevServer } from "vite";

import { spaFallback } from "../../spaFallback.js";
import {
  authRouter,
  loginHandler,
  logoutHandler,
  requireAuth,
} from "./routes/auth.js";
import { dailiesRouter } from "./routes/dailies.js";
import { eggnetRouter } from "./routes/eggnet.js";
import { messageRouter } from "./routes/message.js";
import { offersRouter } from "./routes/offers.js";
import { pilotRouter } from "./routes/pilot.js";
import { raffleCsvRouter, raffleRouter } from "./routes/raffle.js";
import { samsaraRouter } from "./routes/samsara.js";
import { subsRouter } from "./routes/subs.js";
import { tagsRouter } from "./routes/tags.js";
import { userRouter } from "./routes/user.js";
import { verifiedJsonRouter, verifiedRouter } from "./routes/verified.js";

export function createOafApp(viteDevServer: ViteDevServer | null): Express {
  const app = express();

  app
    .use(cors())
    .use(cookieParser())
    .use(
      viteDevServer
        ? viteDevServer.middlewares
        : express.static("build/client/oaf"),
    )
    .use(bodyParser.json())
    .get("/favicon.ico", (_req, res) => void res.send())
    // Public data exports
    .use("/verified.json", verifiedJsonRouter)
    .use("/raffle.csv", raffleCsvRouter)
    // Webhook routes
    .use("/webhooks/subsrolling", subsRouter)
    .use("/webhooks/samsara", samsaraRouter)
    .use("/webhooks/eggnet", eggnetRouter)
    // Auth routes
    .get("/login", loginHandler)
    .get("/logout", logoutHandler)
    .use("/api/auth", authRouter)
    // Admin API routes (require auth)
    .use("/api/admin/dailies", requireAuth, dailiesRouter)
    .use("/api/admin/offers", requireAuth, offersRouter)
    .use("/api/admin/pilot", requireAuth, pilotRouter)
    .use("/api/admin/tags", requireAuth, tagsRouter)
    .use("/api/admin/verified", requireAuth, verifiedRouter)
    .use("/api/admin/raffle", requireAuth, raffleRouter)
    // Resource API routes (require auth)
    .use("/api/resources/message", requireAuth, messageRouter)
    .use("/api/resources/user", requireAuth, userRouter)
    // SPA fallback
    .get("*path", spaFallback(viteDevServer, "oaf"));

  return app;
}
