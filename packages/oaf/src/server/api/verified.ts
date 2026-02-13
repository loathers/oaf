import { Router } from "express";

import { getVerifiedPlayers } from "../../clients/database.js";

export const verifiedRouter = Router();

verifiedRouter.get("/", async (_req, res) => {
  const players = await getVerifiedPlayers();
  res.json({ players });
});
