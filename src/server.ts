import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { StatusCodes } from "http-status-codes";

import { prisma } from "./clients/database.js";

const app = new App();

app
  .use(cors())
  .get("/", (req, res) => void res.send("oafin time"))
  .get("/api/greenbox/:playerId", async (req, res) => {
    const playerId = Number(req.params.playerId);

    if (Number.isNaN(playerId) || playerId < 1)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId is invalid" });

    const player = await prisma.player.findUnique({ where: { playerId } });

    const { greenboxString, greenboxLastUpdate } = player ?? {};

    if (!greenboxString || !greenboxLastUpdate)
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No greenbox data found" });

    return res.status(StatusCodes.OK).json({
      greenboxString,
      greenboxLastUpdate,
    });
  });

export const startApiServer = () => app.listen(Number(process.env.PORT) || 8080);
