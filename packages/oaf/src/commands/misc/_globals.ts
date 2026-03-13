import { bold, heading, hideLinkEmbed, hyperlink, italic } from "discord.js";
import { SkeletonOfCrimboPast } from "kol.js/domains/SkeletonOfCrimboPast";

import { LoathingDate } from "../../clients/LoathingDate.js";
import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import {
  getDaily,
  getGlobalsMessage,
  upsertDaily,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { getMallPrice, kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";

// ── Daily key definitions ──

const numberFormat = new Intl.NumberFormat();

async function renderSocp(data: string): Promise<string> {
  const { itemId, price } = JSON.parse(data) as {
    itemId: number;
    price: number;
  };

  const item = dataOfLoathingClient.findItemById(itemId);
  if (!item) return data;

  const wikiLink = dataOfLoathingClient.getWikiLink(item);
  const itemDisplay = wikiLink
    ? hyperlink(item.name, hideLinkEmbed(wikiLink))
    : item.name;

  const value = await (async () => {
    if (price <= 0) return null;
    if (!item.tradeable) return `\u{267E}\u{FE0F}`;
    try {
      const mallPrice = (await getMallPrice(item.id)).mallPrice;
      const meatPerKnuckle = numberFormat.format(Math.round(mallPrice / price));
      return hyperlink(
        `${meatPerKnuckle} Meat`,
        hideLinkEmbed(`https://pricegun.loathers.net/item/${item.id}`),
      );
    } catch {
      return null;
    }
  })();

  return `${itemDisplay} for ${numberFormat.format(price)} knucklebones${value ? ` (${value}/\u{1F9B4})` : ""}`;
}

function renderRestaurantItem(data: string): string {
  const item = dataOfLoathingClient.findItemByName(data);
  if (!item) return data;
  const link = hyperlink(data, hideLinkEmbed(dataOfLoathingClient.getWikiLink(item) ?? ""));
  const price = item.autosell * 3;
  return `${link} (${price > 0 ? `${price} Meat` : "unknown price"})`;
}

export type DailyGlobal = {
  key: string;
  displayName: string;
  crowdsourced: boolean;
  render?: (data: string) => Promise<string> | string;
};

export const DAILY_GLOBALS: DailyGlobal[] = [
  {
    key: "snootee",
    displayName: "Chez Snootée",
    crowdsourced: true,
    render: (data) => renderRestaurantItem(data),
  },
  {
    key: "microbrewery",
    displayName: "Gnomish Microbrewery",
    crowdsourced: true,
    render: (data) => renderRestaurantItem(data),
  },
  {
    key: "jickjar",
    displayName: "Jick Jar",
    crowdsourced: true,
    render: (data) =>
      `Players whose id % 23 = ${data} can make a ${hyperlink("jar of psychoses (Jick)", hideLinkEmbed("https://wiki.kingdomofloathing.com/Jar_of_psychoses_(Jick)"))} today!`,
  },
  {
    key: "votemonster",
    displayName: "Voting Booth Monster ",
    crowdsourced: true,
  },
  {
    key: "socp",
    displayName: "Skeleton of Crimbo Past",
    crowdsourced: false,
    render: renderSocp,
  },
];

export const CONSENSUS_THRESHOLD = 5;

// ── SOCP fetching ──

const socp = new SkeletonOfCrimboPast(kolClient);

async function fetchSocpData(): Promise<string> {
  const special = await socp.getDailySpecial();
  if (!special) throw new Error("Could not fetch SOCP data");

  const { descId, price } = special;

  const item = dataOfLoathingClient.findItemByDescId(descId);
  if (!item) throw new Error(`Unknown item with descid ${descId}`);

  return JSON.stringify({ itemId: item.id, price });
}

// ── Globals message ──

async function renderDailyValue(
  entry: DailyGlobal,
  data: string,
): Promise<string> {
  if (!entry.render) return data;
  try {
    return await entry.render(data);
  } catch {
    return data;
  }
}

export async function buildGlobalsContent(gameday: number): Promise<string> {
  const lines = [`${heading("Globals \u{1F30D}", 2)}`];

  for (const entry of DAILY_GLOBALS) {
    const daily = await getDaily(entry.key, gameday);
    const display = daily
      ? await renderDailyValue(entry, daily.value)
      : italic("waiting for reports");
    lines.push(`${bold(entry.displayName)}: ${display}`);
  }

  return lines.join("\n");
}

export async function updateGlobalsMessage() {
  try {
    const gameday = LoathingDate.fromRealDate(new Date());
    const stored = await getGlobalsMessage(gameday);
    if (!stored) return;

    const guild = await discordClient.guilds.fetch(config.GUILD_ID);
    const channel = guild?.channels.cache.get(stored.channelId);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(stored.messageId);
    const content = await buildGlobalsContent(gameday);
    await message.edit({ content, allowedMentions: { users: [] } });
  } catch {
    // Message may have been deleted — silently ignore
  }
}

export async function buildGlobals(
  gameday: number,
): Promise<string> {
  try {
    const socpData = await fetchSocpData();
    await upsertDaily("socp", gameday, socpData);
  } catch {
    // SOCP fetch failed — placeholder will show
  }

  return await buildGlobalsContent(gameday);
}
