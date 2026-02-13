import { Router } from "express";

import { getRafflesWithWinners } from "../../clients/database.js";

export const raffleRouter = Router();

raffleRouter.get("/", async (_req, res) => {
  const raffles = await getRafflesWithWinners();
  res.json({ raffles });
});
