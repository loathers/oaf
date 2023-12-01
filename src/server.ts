import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { StatusCodes } from "http-status-codes";

import { prisma } from "./clients/database.js";
import { config } from "./config.js";
import { rollSubs } from "./subs.js";

const app = new App();

app
  .use(cors())
  .get("/", (req, res) => void res.send("oafin time"))
  .get("/api/greenbox/:playerId", async (req, res) => {
    const playerId = Number(req.params.playerId);

    if (Number.isNaN(playerId) || playerId < 1)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "playerId is invalid" });

    const latestGreenbox = await prisma.greenbox.findFirst({
      where: { playerId },
      orderBy: { id: "desc" },
      select: {
        player: true,
        data: true,
        time: true,
      },
    });

    if (!latestGreenbox)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "No greenbox data found" });

    const greenboxEntryCount = await prisma.greenbox.count({
      where: { playerId },
    });

    return res.status(StatusCodes.OK).json({
      greenboxString: latestGreenbox.data,
      greenboxLastUpdate: latestGreenbox.time,
      greenboxEntryCount,
    });
  })
  .get("/api/greenboxhistory/:playerId/:greenboxNumber", async (req, res) => {
    const playerId = Number(req.params.playerId);
    const greenboxNumber = Number(req.params.greenboxNumber);

    if (Number.isNaN(playerId) || playerId < 1)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "playerId is invalid" });

    if (Number.isNaN(greenboxNumber) || greenboxNumber < 1)
      return res
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
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `We don't know about that player`,
      });

    const greenboxEntry = player.greenbox.at(0);

    if (!greenboxEntry) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `That greenbox entry doesn't exist`,
      });
    }

    return res.status(StatusCodes.OK).json({
      greenboxString: greenboxEntry.data,
      greenboxLastUpdate: greenboxEntry.time,
      greenboxEntryCount: player._count,
    });
  })
  .get("/webhooks/subsrolling", async (req, res) => {
    const token = req.query.token;

    if (!token)
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token" });
    if (token !== config.SUBS_ROLLING_TOKEN)
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Invalid token" });

    try {
      await rollSubs();
      return res.status(StatusCodes.OK).json({ status: "Thanks Chris!" });
    } catch (e) {
      if (e instanceof Error) {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: e.message });
      }

      throw e;
    }
  });

export const startApiServer = () => app.listen(config.PORT);
