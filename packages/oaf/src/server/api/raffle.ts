import { Router } from "express";

import { prisma } from "../../clients/database.js";

export const raffleRouter = Router();

raffleRouter.get("/", async (_req, res) => {
  const raffles = await prisma.raffle.findMany({
    orderBy: [{ gameday: "desc" }],
    include: {
      winners: {
        include: {
          player: true,
        },
      },
    },
  });

  res.json({ raffles });
});
