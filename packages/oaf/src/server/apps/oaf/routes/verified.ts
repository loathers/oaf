import { Router } from "express";

import {
  getVerifiedPlayerIds,
  getVerifiedPlayers,
} from "../../../../clients/database.js";

export const verifiedRouter = Router();

verifiedRouter.get("/", async (_req, res) => {
  const players = await getVerifiedPlayers();
  res.json({ players });
});

export const verifiedJsonRouter = Router();

verifiedJsonRouter.get("/", async (_req, res) => {
  const verified = await getVerifiedPlayerIds();
  return void res.set("Content-Type", "application/json").send(verified);
});
