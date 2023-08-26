import { App, getHostname, getProtocol } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { PermissionsBitField } from "discord.js";
import { StatusCodes } from "http-status-codes";

import { prisma } from "./clients/database.js";
import { discordClient } from "./clients/discord.js";

const PORT = Number(process.env.PORT) || 8080;
const GUILD_ID = process.env.GUILD_ID!;

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

    if (!req.query.code) {
      return res.redirect(
        `https://discord.com/api/oauth2/authorize?client_id=${
          process.env.CLIENT_ID
        }&redirect_uri=${encodeURIComponent(
          redirectUrl.toString(),
        )}&response_type=code&scope=applications.commands.permissions.update identify`,
      );
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
        code: req.query.code as string,
        grant_type: "authorization_code",
        redirect_uri: redirectUrl.toString(),
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenType,
      expires_in: expiresIn,
    } = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };

    const headers = { Authorization: `${tokenType} ${accessToken}` };

    const userRequest = await fetch(`https://discord.com/api/users/@me`, {
      method: "GET",
      headers,
    });
    const userData = (await userRequest.json()) as { id: string };

    const guild = discordClient.guilds.cache.find((g) => g.id === GUILD_ID);
    const member = await guild?.members.fetch(userData.id);

    if (!member?.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "You must have sufficient permissions to administer the guild." });

    await prisma.settings.upsert({
      where: { key: "oauthRefreshToken" },
      create: { key: "oauthRefreshToken", value: refreshToken },
      update: { value: refreshToken },
    });

    discordClient.setOauthToken(accessToken, expiresIn);

    return res.status(StatusCodes.OK).json({ status: "Success" });
  });

export const startApiServer = () => app.listen(PORT);
