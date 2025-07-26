import { milliseconds } from "date-fns";
import {
  ChatInputCommandInteraction,
  Events,
  SlashCommandBuilder,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

const CHECK_DURATION = { minutes: 1 };

export const data = new SlashCommandBuilder()
  .setName("flowers")
  .setDescription("Find information about the tulip market (from TTT).");

async function visitFlowerTradeIn(): Promise<string> {
  return kolClient.fetchText("shop.php?whichshop=flowertradein");
}

type Prices = {
  red: number;
  white: number;
  blue: number;
};

export function parsePrices(page: string): Prices | null {
  const pattern =
    /<tr rel="7567">.*?Chroner<\/b>&nbsp;<b>\((\d+)\)<\/b>.*?descitem\((\d+)\).*?<\/tr>/gs;
  const matches = [...page.matchAll(pattern)];

  if (matches.length !== 3) return null;

  const prices = matches.reduce(
    (acc, m) => ({ ...acc, [m[2]]: Number(m[1]) }),
    {} as Record<string, number>,
  );

  return {
    red: prices["973996072"] ?? 0,
    white: prices["156741343"] ?? 0,
    blue: prices["126513532"] ?? 0,
  };
}

const numberFormat = new Intl.NumberFormat();

function createPriceEmbed(prices: Prices) {
  return createEmbed()
    .setTitle("🌷 The Central Loathing Floral Mercantile Exchange 🌷")
    .addFields([
      {
        name: "red tulips 🔴",
        value: numberFormat.format(prices.red),
      },
      {
        name: "white tulips ⚪",
        value: numberFormat.format(prices.white),
      },
      {
        name: "blue tulips 🔵",
        value: numberFormat.format(prices.blue),
      },
    ]);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const page = await visitFlowerTradeIn();

  const prices = parsePrices(page);

  if (!prices)
    return void (await interaction.editReply(
      "I wasn't able to read the current prices from the floral mercantile exchange.",
    ));

  await interaction.editReply({
    content: null,
    embeds: [createPriceEmbed(prices)],
  });
}

async function checkPrices() {
  const page = await visitFlowerTradeIn();
  const prices = parsePrices(page);
  if (!prices) return;

  const lastPrices = await prisma.flowerPrices.findFirst({
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  // Return if we already have these prices
  if (
    lastPrices &&
    lastPrices.red === prices.red &&
    lastPrices.white === prices.white &&
    lastPrices.blue === prices.blue
  )
    return;

  await prisma.flowerPrices.create({
    data: {
      red: prices.red,
      white: prices.white,
      blue: prices.blue,
    },
  });

  const alertees = await prisma.flowerPriceAlert.findMany({
    where: {
      OR: [
        { price: { lte: prices.red } },
        { price: { lte: prices.white } },
        { price: { lte: prices.blue } },
      ],
    },
    select: { player: true, price: true },
  });

  for (const { price, player } of alertees) {
    if (!player.discordId) continue;
    const user = await discordClient.users.fetch(player.discordId);
    const channel = await user.createDM();
    await channel.send({
      content: `🌷 You are receiving this alert because you asked me to notify you when a tulip is redeemable for ${price} or higher.`,
      embeds: [createPriceEmbed(prices)],
    });
  }
}

export async function init() {
  discordClient.on(
    Events.ClientReady,
    () => void setInterval(checkPrices, milliseconds(CHECK_DURATION)),
  );
}
