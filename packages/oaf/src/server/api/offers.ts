import { Router } from "express";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { prisma } from "../../clients/database.js";

export const offersRouter = Router();

offersRouter.get("/", async (_req, res) => {
  const offers = await prisma.standingOffer.findMany({
    select: {
      itemId: true,
      price: true,
      buyer: {
        select: {
          playerId: true,
          playerName: true,
        },
      },
    },
  });

  res.json({
    offers: offers.map((o) => ({
      ...o,
      price: Number(o.price),
      itemName:
        dataOfLoathingClient.items.find((i) => i.id === o.itemId)?.name ??
        "Unknown",
    })),
  });
});
