/// <reference types="../../remix.env.d.ts" />
import { createRequestHandler } from "@remix-run/express";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { StatusCodes } from "http-status-codes";
import path from "node:path";

import { prisma } from "../clients/database.js";
import { discordClient } from "../clients/discord.js";
import { wikiClient } from "../clients/wiki.js";
import { config } from "../config.js";
import { samsara } from "./samsara.js";
import { rollSubs } from "./subs.js";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
  : await import(path.resolve("build/server/index.js"));

const app = express();

app
  .use(cors())
  .use(
    viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
  )
  .use(bodyParser.json())
  .get("/favicon.ico", (req, res) => void res.send())
  .get("/api/greenbox/:playerId", async (req, res) => {
    const playerId = Number(req.params.playerId);

    if (Number.isNaN(playerId) || playerId < 1)
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "playerId is invalid" });

    const latestGreenbox = await prisma.greenbox.findFirst({
      where: { playerId },
      orderBy: { id: "desc" },
      select: {
        player: true,
        data: true,
        createdAt: true,
      },
    });

    if (!latestGreenbox)
      return void res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "No greenbox data found" });

    const total = await prisma.greenbox.count({
      where: { playerId },
    });

    return void res.status(StatusCodes.OK).json({
      data: latestGreenbox.data,
      createdAt: latestGreenbox.createdAt,
      total,
    });
  })
  .get("/api/greenbox/:playerId/:greenboxNumber", async (req, res) => {
    const playerId = Number(req.params.playerId);
    const greenboxNumber = Number(req.params.greenboxNumber);

    if (Number.isNaN(playerId) || playerId < 1)
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "playerId is invalid" });

    if (Number.isNaN(greenboxNumber) || greenboxNumber < 1)
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "greenboxNumber is invalid" });

    const player = await prisma.player.findFirst({
      where: { playerId },
      include: {
        greenbox: {
          orderBy: { id: "asc" },
          skip: greenboxNumber - 1,
          take: 1,
        },
        _count: {
          select: {
            greenbox: true,
          },
        },
      },
    });

    if (!player)
      return void res.status(StatusCodes.NOT_FOUND).json({
        error: `We don't know about that player`,
      });

    const greenbox = player.greenbox.at(0);

    if (!greenbox) {
      return void res.status(StatusCodes.NOT_FOUND).json({
        error: `That greenbox entry doesn't exist`,
      });
    }

    return void res.status(StatusCodes.OK).json({
      data: greenbox.data,
      createdAt: greenbox.createdAt,
      total: player._count.greenbox,
    });
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

    try {
      await samsara(req.body);
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
  .all(
    "*route",
    createRequestHandler({
      build,
      getLoadContext: () => ({ discordClient, wikiClient }),
    }),
  );

export const startApiServer = () =>
  app.listen(config.PORT, () =>
    console.log(`Server listening on ${config.PORT}`),
  );
