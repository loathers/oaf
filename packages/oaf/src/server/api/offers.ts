import { Router } from "express";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { getAllOffersWithBuyers } from "../../clients/database.js";

export const offersRouter = Router();

offersRouter.get("/", async (_req, res) => {
  const offers = await getAllOffersWithBuyers();

  res.json({
    offers: offers.map((o) => ({
      itemId: o.itemId,
      price: Number(o.price),
      itemName: dataOfLoathingClient.findItemById(o.itemId)?.name ?? "Unknown",
      buyer: {
        playerId: o.playerId,
        playerName: o.playerName,
      },
    })),
  });
});
