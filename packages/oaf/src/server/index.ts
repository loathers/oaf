import { createRequestHandler } from "@react-router/express";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { StatusCodes } from "http-status-codes";
import path from "node:path";

import {
  DataOfLoathingClient,
  dataOfLoathingClient,
} from "../clients/dataOfLoathing.js";
import { prisma } from "../clients/database.js";
import { DiscordClient, discordClient } from "../clients/discord.js";
import { config } from "../config.js";
import { eggnet } from "./eggnet.js";
import { samsara } from "./samsara.js";
import { rollSubs } from "./subs.js";

declare module "react-router" {
  export interface AppLoadContext {
    discordClient: DiscordClient;
    dataOfLoathingClient: DataOfLoathingClient;
  }
}

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
  : await import(path.resolve("build/server/index.js"));

function arrayToCsv<T extends object>(data: T[], headers: (keyof T)[]): string {
  // Create the header row based on the provided order
  const headerRow = headers.join(",");

  // Map each object to a CSV row based on the header order
  const rows = data.map((item) =>
    headers.map((header) => JSON.stringify(item[header] ?? "")).join(","),
  );

  // Combine the header row and data rows into a single CSV string
  return [headerRow, ...rows].join("\n");
}

const app = express();

app
  .use(cors())
  .use(
    viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
  )
  .use(bodyParser.json())
  .get("/favicon.ico", (req, res) => void res.send())
  .get("/verified.json", async (req, res) => {
    const verified = await prisma.player.findMany({
      where: { discordId: { not: null } },
      select: {
        playerId: true,
      },
    });

    return void res
      .set("Content-Type", "application/json")
      .send(verified.map((p) => p.playerId));
  })
  .get("/raffle.csv", async (req, res) => {
    const raffles = (
      await prisma.raffle.findMany({
        orderBy: { gameday: "asc" },
        select: {
          gameday: true,
          messageId: true,
          firstPrize: true,
          secondPrize: true,
          winners: {
            select: {
              player: { select: { playerId: true, playerName: true } },
              place: true,
              tickets: true,
            },
          },
        },
      })
    ).map(({ winners, ...r }) => {
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

    try {
      await eggnet(req.body);
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
    "*path",
    createRequestHandler({
      build,
      getLoadContext: () => ({ discordClient, dataOfLoathingClient }),
    }),
  );

export const startApiServer = () =>
  app.listen(config.PORT, () =>
    console.log(`Server listening on ${config.PORT}`),
  );
