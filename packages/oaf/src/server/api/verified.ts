import { Router } from "express";

import { prisma } from "../../clients/database.js";

export const verifiedRouter = Router();

verifiedRouter.get("/", async (_req, res) => {
  const players = await prisma.player.findMany({
    where: { discordId: { not: null } },
  });
  res.json({ players });
});
