import { App, getHostname, getProtocol } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { StatusCodes } from "http-status-codes";

import { prisma } from "./clients/database.js";

const PORT = Number(process.env.PORT) || 8080;

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
  })
  .get("/auth", async (req, res) => {
    const redirectUrl = new URL("http://example.com");
    redirectUrl.protocol = getProtocol(req);
    redirectUrl.hostname = getHostname(req)!;
    redirectUrl.pathname = "auth";
    redirectUrl.port = String(PORT);

    if (req.query.code) {
      const tokenQuery = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID!,
          client_secret: process.env.CLIENT_SECRET!,
          code: req.query.code as string,
          grant_type: "authorization_code",
          redirect_uri: redirectUrl.toString(),
          scope: "identify",
        }).toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return void res.json(await tokenQuery.json());
    }

    res.redirect(
      `https://discord.com/api/oauth2/authorize?client_id=${
        process.env.CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        redirectUrl.toString(),
      )}&response_type=code&scope=applications.commands.permissions.update`,
    );
  });

export const startApiServer = () => app.listen(PORT);
