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

    const greenboxEntryCount = await prisma.greenbox.count({
      where: { playerId },
    });

    if (greenboxEntryCount === 0)
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `asked for greenbox number ${greenboxNumber}, but player ${playerId} has no greenbox data`,
      });

    if (greenboxEntryCount < greenboxNumber)
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `asked for greenbox number ${greenboxNumber}, but player ${playerId} only has ${greenboxEntryCount} greenbox updates`,
      });

    const greenboxEntry = await prisma.greenbox.findFirst({
      where: { playerId },
      orderBy: { id: "asc" },
      skip: greenboxNumber - 1,
      select: {
        player: true,
        data: true,
        time: true,
      },
    });

    if (!greenboxEntry)
      return res.status(StatusCodes.NOT_FOUND).json({
        error: `Player has either no greenbox data, or less than ${greenboxNumber} updates`,
      });

    return res.status(StatusCodes.OK).json({
      greenboxString: greenboxEntry.data,
      greenboxLastUpdate: greenboxEntry.time,
      greenboxEntryCount,
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
