import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { StatusCodes } from "http-status-codes";
import fs from "node:fs";
import path from "node:path";

import { dataOfLoathingClient } from "../clients/dataOfLoathing.js";
import { getRafflesForCsv, getVerifiedPlayerIds } from "../clients/database.js";
import { config } from "../config.js";
import {
  authRouter,
  loginHandler,
  logoutHandler,
  requireAuth,
} from "./api/auth.js";
import { messageRouter } from "./api/message.js";
import { offersRouter } from "./api/offers.js";
import { pilotRouter } from "./api/pilot.js";
import { raffleRouter } from "./api/raffle.js";
import { tagsRouter } from "./api/tags.js";
import { userRouter } from "./api/user.js";
import { verifiedRouter } from "./api/verified.js";
import { eggnet, eggnetNewUnlockSchema } from "./eggnet.js";
import { samsara, samsaraRecordsSchema } from "./samsara.js";
import { rollSubs } from "./subs.js";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
          appType: "custom",
        }),
      );

function arrayToCsv<T extends object>(data: T[], headers: (keyof T)[]): string {
  const headerRow = headers.join(",");
  const rows = data.map((item) =>
    headers.map((header) => JSON.stringify(item[header] ?? "")).join(","),
  );
  return [headerRow, ...rows].join("\n");
}

const app = express();

app
  .use(cors())
  .use(cookieParser())
  .use(
    viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
  )
  .use(bodyParser.json())
  .get("/favicon.ico", (_req, res) => void res.send())
  .get("/verified.json", async (_req, res) => {
    const verified = await getVerifiedPlayerIds();

    return void res.set("Content-Type", "application/json").send(verified);
  })
  .get("/raffle.csv", async (_req, res) => {
    const raffles = (await getRafflesForCsv()).map(({ winners, ...r }) => {
      const firstPrize = dataOfLoathingClient.items.find(
        (i) => i.id === r.firstPrize,
      );
      const secondPrize = dataOfLoathingClient.items.find(
        (i) => i.id === r.secondPrize,
      );
      const firstWinner = winners.find((w) => w.place === 1)!;
      const secondWinners = winners.filter((w) => w.place === 2);
      return {
        ...r,
        firstPrize: firstPrize?.name ?? `Unknown item #${r.firstPrize}`,
        secondPrize: secondPrize?.name ?? `Unknown item #${r.secondPrize}`,
        firstPlaceWinner: firstWinner
          ? `${firstWinner.player.playerName} (#${firstWinner.player.playerId})`
          : "",
        firstPlaceWinnerTickets: firstWinner ? firstWinner.tickets : "",
        ...secondWinners.reduce<
          Partial<
            Record<
              | `secondPlaceWinner${1 | 2 | 3}`
              | `secondPlaceWinner${1 | 2 | 3}Tickets`,
              string
            >
          >
        >(
          (acc, w, i) => ({
            ...acc,
            [`secondPlaceWinner${i + 1}`]: `${w.player.playerName} (#${w.player.playerId})`,
            [`secondPlaceWinner${i + 1}Tickets`]: w.tickets,
          }),
          {},
        ),
      };
    });

    return void res
      .set("Content-Type", "text/csv")
      .send(
        arrayToCsv(raffles, [
          "gameday",
          "firstPrize",
          "firstPlaceWinner",
          "firstPlaceWinnerTickets",
          "secondPrize",
          "secondPlaceWinner1",
          "secondPlaceWinner1Tickets",
          "secondPlaceWinner2",
          "secondPlaceWinner2Tickets",
          "secondPlaceWinner3",
          "secondPlaceWinner3Tickets",
        ]),
      );
  })
  .get("/webhooks/subsrolling", async (req, res) => {
    const token = req.query.token;

    if (!token)
      return void res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "No token" });
    if (token !== config.SUBS_ROLLING_TOKEN)
      return void res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Invalid token" });

    try {
      await rollSubs();
      return void res.status(StatusCodes.OK).json({ status: "Thanks Chris!" });
    } catch (e) {
      if (e instanceof Error) {
        return void res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: e.message });
      }

      throw e;
    }
  })
  .post("/webhooks/samsara", async (req, res) => {
    const token = req.query.token;

    if (!token)
      return void res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "No token" });
    if (token !== config.SAMSARA_TOKEN)
      return void res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Invalid token" });

    const body = samsaraRecordsSchema.safeParse(req.body);

    if (!body.success) {
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid body" });
    }

    try {
      await samsara(body.data);
      return void res.status(StatusCodes.OK).json({ success: "true" });
    } catch (e) {
      if (e instanceof Error) {
        return void res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: e.message });
      }

      throw e;
    }
  })
  .post("/webhooks/eggnet", async (req, res) => {
    const token = req.query.token;

    if (!token)
      return void res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "No token" });
    if (token !== config.EGGNET_TOKEN)
      return void res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Invalid token" });

    const body = eggnetNewUnlockSchema.safeParse(req.body);

    if (!body.success) {
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid body" });
    }

    try {
      await eggnet(body.data);
      return void res.status(StatusCodes.OK).json({ success: "true" });
    } catch (e) {
      if (e instanceof Error) {
        return void res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: e.message });
      }

      throw e;
    }
  })
  // Auth routes
  .get("/login", loginHandler)
  .get("/logout", logoutHandler)
  .use("/api/auth", authRouter)
  // Admin API routes (require auth)
  .use("/api/admin/offers", requireAuth, offersRouter)
  .use("/api/admin/pilot", requireAuth, pilotRouter)
  .use("/api/admin/tags", requireAuth, tagsRouter)
  .use("/api/admin/verified", requireAuth, verifiedRouter)
  .use("/api/admin/raffle", requireAuth, raffleRouter)
  // Resource API routes (require auth)
  .use("/api/resources/message", requireAuth, messageRouter)
  .use("/api/resources/user", requireAuth, userRouter)
  // SPA fallback
  .get("*path", async (req, res) => {
    if (viteDevServer) {
      const html = fs.readFileSync(
        path.resolve("src/server/web/index.html"),
        "utf-8",
      );
      const transformed = await viteDevServer.transformIndexHtml(req.url, html);
      res.set("Content-Type", "text/html").send(transformed);
    } else {
      res.sendFile(path.resolve("build/client/index.html"));
    }
  });

export const startApiServer = () =>
  app.listen(config.PORT, () =>
    console.log(`Server listening on ${config.PORT}`),
  );
