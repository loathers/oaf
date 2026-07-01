import { Router } from "express";
import { LoathingDate, toWikiLink } from "kol.js";

import { dataOfLoathingClient } from "../../../../clients/dataOfLoathing.js";
import {
  getDailiesForGamedayRange,
  getMrStoreItemEventsForDateRange,
  getPvpSeasonsForDateRange,
  getRafflesForGamedayRange,
} from "../../../../clients/database.js";
import { DAILY_GLOBALS } from "../../../../commands/misc/_globals.js";
import type {
  CalendarData,
  MrStoreItemEvent,
  PvpSeasonInfo,
  TextSegment,
} from "../web/types/calendar.js";

const numberFormat = new Intl.NumberFormat();

function renderRestaurantItem(data: string): TextSegment[] {
  const item = dataOfLoathingClient.findItemByName(data);
  if (!item) return [{ text: data }];
  const wikiLink = dataOfLoathingClient.getWikiLink(item);
  const price = item.autosell * 3;
  return [
    { text: data, href: wikiLink ?? undefined },
    { text: price > 0 ? ` (${price} Meat)` : "" },
  ];
}

function renderSocp(data: string): TextSegment[] {
  const { itemId, price } = JSON.parse(data) as {
    itemId: number;
    price: number;
  };
  const item = dataOfLoathingClient.findItemById(itemId);
  if (!item) return [{ text: data }];
  const wikiLink = dataOfLoathingClient.getWikiLink(item);
  const itemName = new LoathingDate().isAprilFools()
    ? "Uncle Hobo's epic beard"
    : item.name;
  return [
    { text: itemName, href: wikiLink ?? undefined },
    { text: ` for ${numberFormat.format(price)} knucklebones` },
  ];
}

function renderVoteMonster(data: string): TextSegment[] {
  const monster = dataOfLoathingClient.findMonsterByName(data);
  if (!monster) return [{ text: data }];
  const wikiLink = dataOfLoathingClient.getWikiLink(monster);
  return [{ text: data, href: wikiLink ?? undefined }];
}

function renderJickJar(data: string): TextSegment[] {
  return [
    { text: `players whose id % 23 = ${data} can make a ` },
    {
      text: "jar",
      href: toWikiLink("Jar of psychoses (Jick)"),
    },
  ];
}

function renderG9(data: string): TextSegment[] {
  return [
    {
      text: `+${data}% all stats`,
      href: toWikiLink("Experimental Effect G-9"),
    },
  ];
}

const RENDERERS: Record<string, (data: string) => TextSegment[]> = {
  snootee: renderRestaurantItem,
  microbrewery: renderRestaurantItem,
  socp: renderSocp,
  votemonster: renderVoteMonster,
  jickjar: renderJickJar,
  g9: renderG9,
};

function renderDaily(key: string, value: string): TextSegment[] {
  const renderer = RENDERERS[key];
  if (!renderer) return [{ text: value }];
  try {
    return renderer(value);
  } catch {
    return [{ text: value }];
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH_MS = LoathingDate.EPOCH.getTime();
const dateToGameday = (d: Date) =>
  Math.floor((d.getTime() - EPOCH_MS) / DAY_MS);

export const calendarRouter = Router();

calendarRouter.get("/", async (req, res) => {
  const from = Number(req.query.from);
  const to = Number(req.query.to);

  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    res.status(400).json({ error: "Invalid from/to parameters" });
    return;
  }

  if (to - from > 400) {
    res.status(400).json({ error: "Range too large (max 400 days)" });
    return;
  }

  const fromDate = new Date(EPOCH_MS + from * DAY_MS);
  const toDate = new Date(EPOCH_MS + (to + 1) * DAY_MS);

  const [dailies, raffles, mrStoreItems, pvpSeasonRows] = await Promise.all([
    getDailiesForGamedayRange(from, to),
    getRafflesForGamedayRange(from, to),
    getMrStoreItemEventsForDateRange(fromDate, toDate),
    getPvpSeasonsForDateRange(fromDate, toDate),
  ]);

  const dailyDisplayNames = new Map(
    DAILY_GLOBALS.map((g) => [g.key, g.displayName]),
  );

  const dailiesByGameday = Map.groupBy(dailies, (d) => d.gameday);

  const mrStoreItemEvents: Record<number, MrStoreItemEvent[]> = {};
  const pushEvent = (gameday: number, event: MrStoreItemEvent) => {
    (mrStoreItemEvents[gameday] ??= []).push(event);
  };

  for (const item of mrStoreItems) {
    if (item.addedToStore) {
      pushEvent(dateToGameday(item.addedToStore), {
        itemName: item.itemName,
        itemImage: item.itemImage,
        type: "added",
        time: item.addedToStore.toISOString(),
      });
    }
    if (item.removedFromStore) {
      pushEvent(dateToGameday(item.removedFromStore), {
        itemName: item.itemName,
        itemImage: item.itemImage,
        type: "removed",
        time: item.removedFromStore.toISOString(),
      });
    }
    if (item.distributedToSubscribers) {
      pushEvent(dateToGameday(item.distributedToSubscribers), {
        itemName: item.itemName,
        itemImage: item.itemImage,
        type: "distributed",
        time: item.distributedToSubscribers.toISOString(),
      });
    }
  }

  const eventOrder = { distributed: 0, added: 1, removed: 2 };
  for (const events of Object.values(mrStoreItemEvents)) {
    events.sort((a, b) => eventOrder[a.type] - eventOrder[b.type]);
  }

  const pvpSeasons: Record<number, PvpSeasonInfo> = Object.fromEntries(
    pvpSeasonRows.map((s) => [
      dateToGameday(s.startDate),
      { seasonNumber: s.seasonNumber, seasonName: s.seasonName },
    ]),
  );

  const result: CalendarData = {
    dailies: Object.fromEntries(
      [...dailiesByGameday.entries()].map(([gameday, entries]) => [
        gameday,
        entries
          .filter((e) => dailyDisplayNames.has(e.key))
          .map((e) => ({
            key: e.key,
            displayName: dailyDisplayNames.get(e.key)!,
            value: e.value,
            rendered: renderDaily(e.key, e.value),
            thresholdReached: e.thresholdReached,
          })),
      ]),
    ),
    raffles: Object.fromEntries(
      raffles.map((r) => {
        const firstItem = dataOfLoathingClient.findItemById(r.firstPrize);
        const secondItem = dataOfLoathingClient.findItemById(r.secondPrize);
        return [
          r.gameday,
          {
            firstPrize: {
              id: r.firstPrize,
              name: firstItem?.name ?? `Unknown item #${r.firstPrize}`,
            },
            secondPrize: {
              id: r.secondPrize,
              name: secondItem?.name ?? `Unknown item #${r.secondPrize}`,
            },
            winners: r.winners,
          },
        ];
      }),
    ),
    mrStoreItemEvents,
    pvpSeasons,
  };

  res.json(result);
});
