import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  bold,
  heading,
  hideLinkEmbed,
  hyperlink,
  italic,
  messageLink,
} from "discord.js";

import { LoathingDate } from "../../clients/LoathingDate.js";
import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { getBirthdays } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { getMallPrice, kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import type { Player } from "../../database-types.js";
import { renderSvg } from "../../svgConverter.js";
import {
  englishJoin,
  formatPlayer,
  getRandom,
  toWikiLink,
} from "../../utils.js";
import { postRaffleOnRollover } from "../kol/raffle.js";

const ADJECTIVES = [
  // Butt jokes
  "cheeky",
  "cracking",
  "divided",
  "fragrant",
  "hungry",
  "muscular",
  "relaxed",
  "retentive",
  'sweaty (in the "tryhard" sense)',
  "thick-as-thieves",
  "tight-knit",
  "well-rounded",
  "wholesome",
  // Generic words
  "dazzling",
  "dependable",
  "devoted",
  "enthusiastic",
  "fabulous",
  "friendly",
  "glamorous",
  "humble",
  "lugubrious",
  "loving",
  "loyal",
  "magnificent",
  "ponderous",
  "radiant",
  "spectacular",
  "steadfast",
];

const numberFormat = new Intl.NumberFormat();

async function buildTitleMessage(adjective: string): Promise<Message> {
  const date = new LoathingDate();

  const holidays = date.getHolidays();
  const dateStr = `Today is ${bold(date.toString())}${holidays.length > 0 ? `  (${englishJoin(holidays.map((h) => hyperlink(h, toWikiLink(h))))})` : ""}`;

  const lines = [
    `# The Daily Toot \u{1F4EF}`,
    italic(`from your ${adjective} ASS`),
    "",
    dateStr,
    date.getMoonDescription(),
  ];

  const files: AttachmentBuilder[] = [];
  try {
    const png = await renderSvg(date.getMoonsAsSvg("Noto Color Emoji"));
    if (png) files.push(new AttachmentBuilder(png, { name: "moons.png" }));
  } catch {
    // Moon rendering is non-critical
  }

  return { content: lines.join("\n"), files };
}

async function birthdaySection(): Promise<string | null> {
  const result = await getBirthdays();
  const birthdays = result.rows;

  if (birthdays.length === 0) return null;

  const currentYear = new Date().getFullYear();

  const byAge = birthdays.reduce<Record<number, Player[]>>((acc, p) => {
    if (!p.accountCreationDate) return acc;
    const age = currentYear - p.accountCreationDate.getFullYear();
    return { ...acc, [age]: [...(acc[age] || []), p] };
  }, {});

  const content = Object.entries(byAge)
    .toSorted((a, b) => Number(a[0]) - Number(b[0]))
    .map(([age, players]) => {
      const playerTags = players.map((p) => formatPlayer(p));
      return `${age} year${age === "1" ? "" : "s"} old: ${englishJoin(
        playerTags,
      )}${age === "11" ? " (ridiculous; not even funny)" : ""}`;
    })
    .join("\n");

  return `${heading("In-Game Birthdays \u{1F382}", 2)}\n\n${content}`;
}

let checkedFamiliars = false;
let hasFamiliar = false;

async function socpSection(): Promise<string | null> {
  if (!checkedFamiliars) {
    const fams = await kolClient.getFamiliars();
    hasFamiliar = fams.some((f) => f.id === 326);
    checkedFamiliars = true;
  }

  if (!hasFamiliar) return null;

  const page = await kolClient.fetchText("main.php", {
    searchParams: { talktosocp: "1" },
  });

  const match = page.match(
    /Daily Special:.*?descitem\((\d+)\).*?\((\d+) knucklebones\)/,
  );

  if (!match) throw new Error("Could not parse daily special from SOCP page");

  const [, descidStr, priceStr] = match;
  const descid = Number(descidStr);
  const price = Number(priceStr);

  const item = dataOfLoathingClient.findItemByDescId(descid);
  if (!item) throw new Error(`Unknown item with descid ${descid}`);

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
      const pricegunLink = hyperlink(
        `${meatPerKnuckle} meat`,
        hideLinkEmbed(`https://pricegun.loathers.net/item/${item.id}`),
      );
      return pricegunLink;
    } catch {
      return null;
    }
  })();

  const lines = [
    `${heading("Skeleton of Crimbo Past \u{1F480}", 2)}`,
    `${itemDisplay} for ${numberFormat.format(price)} knucklebones${value ? ` (${value}/\u{1F9B4})` : ""}`,
  ];

  return lines.join("\n");
}

type Message = { content: string; files?: AttachmentBuilder[] };

async function buildSection(
  name: string,
  fn: () => Promise<Message | null>,
): Promise<Message | null> {
  try {
    return await fn();
  } catch (error) {
    await discordClient.alert(
      `${name} section failed in newsletter: ${String(error)}`,
    );
    return null;
  }
}

async function onRollover() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const channel = guild?.channels.cache.get(config.NEWSLETTER_CHANNEL_ID);

  if (!channel?.isTextBased()) {
    await discordClient.alert("Newsletter channel not found or not text-based");
    return;
  }

  const adjective = getRandom(ADJECTIVES);
  const titleMessage = await buildTitleMessage(adjective);
  await channel.send({ ...titleMessage, allowedMentions: { users: [] } });

  const messages = [
    await buildSection("Birthdays", async () => {
      const content = await birthdaySection();
      return content ? { content } : null;
    }),
    await buildSection("Raffle", async () => {
      const raffleMessage = await postRaffleOnRollover();
      if (!raffleMessage) return null;
      return {
        content: `${heading("Raffle Results \u{1F3B0}", 2)}\n\n${messageLink(raffleMessage.channelId, raffleMessage.id)}`,
      };
    }),
    await buildSection("Skeleton of Crimbo Past", async () => {
      const content = await socpSection();
      return content ? { content } : null;
    }),
  ];

  for (const message of messages) {
    if (!message) continue;
    await channel.send({ ...message, allowedMentions: { users: [] } });
  }
}

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Manually trigger the Daily Toot newsletter");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) return;

  if (!interaction.member.roles.cache.has(config.EXTENDED_TEAM_ROLE_ID)) {
    await interaction.reply({
      content: "You are not permitted to trigger the newsletter.",
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  await onRollover();
  await interaction.editReply("Newsletter posted!");
}

export function init() {
  kolClient.on("rollover", () => void onRollover());
}
