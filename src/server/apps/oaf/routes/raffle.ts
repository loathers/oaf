import { Router } from "express";

import { dataOfLoathingClient } from "../../../../clients/dataOfLoathing.js";
import {
  getRafflesForCsv,
  getRafflesWithWinners,
} from "../../../../clients/database.js";

function arrayToCsv<T extends object>(data: T[], headers: (keyof T)[]): string {
  const headerRow = headers.join(",");
  const rows = data.map((item) =>
    headers.map((header) => JSON.stringify(item[header] ?? "")).join(","),
  );
  return [headerRow, ...rows].join("\n");
}

export const raffleRouter = Router();

raffleRouter.get("/", async (_req, res) => {
  const raffles = await getRafflesWithWinners();
  res.json({ raffles });
});

export const raffleCsvRouter = Router();

raffleCsvRouter.get("/", async (_req, res) => {
  const raffles = (await getRafflesForCsv()).map(({ winners, ...r }) => {
    const firstPrize = dataOfLoathingClient.findItemById(r.firstPrize);
    const secondPrize = dataOfLoathingClient.findItemById(r.secondPrize);
    const firstWinner = winners.find((w) => w.place === 1)!;
    const secondWinners = winners.filter((w) => w.place === 2);
    return {
      ...r,
      firstPrize: firstPrize?.name ?? `Unknown item #${r.firstPrize}`,
      secondPrize: secondPrize?.name ?? `Unknown item #${r.secondPrize}`,
      firstPlaceWinner: firstWinner
        ? `${firstWinner.player.playerName} (#${firstWinner.player.playerId})`
        : "",
      firstPlaceWinnerTickets: firstWinner ? firstWinner.tickets : "",
      ...secondWinners.reduce<
        Partial<
          Record<
            | `secondPlaceWinner${1 | 2 | 3}`
            | `secondPlaceWinner${1 | 2 | 3}Tickets`,
            string
          >
        >
      >(
        (acc, w, i) => ({
          ...acc,
          [`secondPlaceWinner${i + 1}`]: `${w.player.playerName} (#${w.player.playerId})`,
          [`secondPlaceWinner${i + 1}Tickets`]: w.tickets,
        }),
        {},
      ),
    };
  });

  return void res
    .set("Content-Type", "text/csv")
    .send(
      arrayToCsv(raffles, [
        "gameday",
        "firstPrize",
        "firstPlaceWinner",
        "firstPlaceWinnerTickets",
        "secondPrize",
        "secondPlaceWinner1",
        "secondPlaceWinner1Tickets",
        "secondPlaceWinner2",
        "secondPlaceWinner2Tickets",
        "secondPlaceWinner3",
        "secondPlaceWinner3Tickets",
      ]),
    );
});
