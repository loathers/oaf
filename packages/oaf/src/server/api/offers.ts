import { Router } from "express";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { getAllOffersWithBuyers } from "../../clients/database.js";

export const offersRouter = Router();

offersRouter.get("/", async (_req, res) => {
  const offers = await getAllOffersWithBuyers();

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
