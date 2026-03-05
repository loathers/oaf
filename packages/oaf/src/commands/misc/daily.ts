import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  bold,
  heading,
  hyperlink,
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
import { englishJoin, formatPlayer, getRandom } from "../../utils.js";
import { postRaffleOnRollover } from "../kol/raffle.js";

const ADJECTIVES = [
  "loving",
  "friendly",
  "wholesome",
  "cheeky",
  "dependable",
  "loyal",
  "enthusiastic",
  "magnificent",
  "glamorous",
  "dazzling",
  "radiant",
  "spectacular",
  "humble",
  "devoted",
  "fabulous",
];

const numberFormat = new Intl.NumberFormat();

async function dateSection(): Promise<{
  text: string;
  attachment: AttachmentBuilder | null;
}> {
  const date = new LoathingDate();
  let attachment: AttachmentBuilder | null = null;

  try {
    const svg = date.getMoonsAsSvg("Noto Color Emoji");
    const png = await renderSvg(svg);
    if (png) {
      attachment = new AttachmentBuilder(png, { name: "moons.png" });
    }
  } catch {
    // Moon rendering is non-critical
  }

  const text = [
    `${heading("Date & Moons")}`,
    `${bold(date.toString())}`,
    date.getMoonDescription(),
  ].join("\n");

  return { text, attachment };
}

async function birthdaySection(): Promise<string | null> {
  const result = await getBirthdays();
  const birthdays = result.rows;

  if (birthdays.length === 0) return null;

  const currentYear = new Date().getFullYear();

  const byAge = birthdays.reduce<Record<number, Player[]>>(
    (acc, p) => {
      if (!p.accountCreationDate) return acc;
      const age = currentYear - p.accountCreationDate.getFullYear();
      return { ...acc, [age]: [...(acc[age] || []), p] };
    },
    {},
  );

  const content = Object.entries(byAge)
    .toSorted((a, b) => Number(a[0]) - Number(b[0]))
    .map(([age, players]) => {
      const playerTags = players.map((p) => formatPlayer(p));
      return `${age} year${age === "1" ? "" : "s"} old: ${englishJoin(
        playerTags,
      )}${age === "11" ? " (ridiculous; not even funny)" : ""}`;
    })
    .join("\n");

  return `${heading("In-Game Birthdays \u{1F382}")}\n\n${content}`;
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

  if (!match) return null;

  const [, descidStr, priceStr] = match;
  const descid = Number(descidStr);
  const price = Number(priceStr);

  const item = dataOfLoathingClient.findItemByDescId(descid);
  if (!item) return null;

  const wikiLink = dataOfLoathingClient.getWikiLink(item);
  const itemDisplay = wikiLink
    ? hyperlink(item.name, wikiLink)
    : item.name;

  const lines = [
    `${heading("SOCP Daily Special \u{1F480}")}`,
    `${itemDisplay} for ${numberFormat.format(price)} knucklebones`,
  ];

  if (price > 0 && item.tradeable) {
    try {
      const mallPrice = (await getMallPrice(item.id)).mallPrice;
      const meatPerKnuckle = numberFormat.format(
        Math.round(mallPrice / price),
      );
      const pricegunLink = hyperlink(
        `${meatPerKnuckle} meat/\u{1F9B4}`,
        `https://pricegun.loathers.net/item/${item.id}`,
      );
      lines.push(`Value: ${pricegunLink}`);
    } catch {
      // Mall price lookup is non-critical
    }
  } else if (price > 0) {
    lines.push(`Value: \u{267E}\u{FE0F} meat/\u{1F9B4}`);
  }

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
    await discordClient.alert(
      "Newsletter channel not found or not text-based",
    );
    return;
  }

  const adjective = getRandom(ADJECTIVES);
  await channel.send({
    content: `# The Daily Toot \u{1F4EF} (from your ${adjective} ASS)`,
    allowedMentions: { users: [] },
  });

  const messages = [
    await buildSection("Date & Moons", async () => {
      const { text, attachment } = await dateSection();
      return { content: text, files: attachment ? [attachment] : undefined };
    }),
    await buildSection("Birthdays", async () => {
      const content = await birthdaySection();
      return content ? { content } : null;
    }),
    await buildSection("SOCP", async () => {
      const content = await socpSection();
      return content ? { content } : null;
    }),
    await buildSection("Raffle", async () => {
      const raffleMessage = await postRaffleOnRollover();
      if (!raffleMessage) return null;
      return {
        content: `${heading("Raffle Results \u{1F3B0}")}\n\n${messageLink(raffleMessage.channelId, raffleMessage.id)}`,
      };
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
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  await onRollover();
  await interaction.editReply("Newsletter posted!");
}

export function init() {
  kolClient.on("rollover", () => void onRollover());
}
