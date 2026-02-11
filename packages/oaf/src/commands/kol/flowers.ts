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
  .setDescription(
    "Set reminders for price thresholds in the tulip market (from TTT).",
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("check").setDescription("Check the current prices"),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("manage")
      .setDescription(
        "Manage your alert price. Can also be used to set or remove (price 0)",
      )
      .addIntegerOption((option) =>
        option
          .setName("price")
          .setDescription("Price for which you want to be alerted.")
          .setRequired(true)
          .setMinValue(0),
      ),
  );

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
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "check": {
      return await replyWithFlowerPrices(interaction);
    }
    case "manage":
      return await manageAlerts(interaction);
    default:
      return await interaction.reply({
        content:
          "Invalid subcommand. It shouldn't be possible to see this message. Please report it.",
        ephemeral: true,
      });
  }
}

async function replyWithFlowerPrices(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const prices = await checkPrices();

  if (!prices) {
    return void (await interaction.editReply(
      "Could not read the flower prices. Please try again later.",
    ));
  }

  const embed = createPriceEmbed(prices);
  return await interaction.editReply({ embeds: [embed] });
}

async function manageAlerts(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const price = interaction.options.getInteger("price", true);

  const player = await prisma.player.findFirst({
    where: { discordId: interaction.user.id },
  });

  if (!player) {
    return void (await interaction.editReply(
      "You need to link your account first.",
    ));
  }

  if (price === 0) {
    await prisma.flowerPriceAlert.deleteMany({
      where: { playerId: player.playerId },
    });
    return void (await interaction.editReply("Removed your price alert."));
  }

  await prisma.flowerPriceAlert.upsert({
    where: { playerId: player.playerId },
    update: { price },
    create: { playerId: player.playerId, price },
  });

  return await interaction.editReply(
    `You will be alerted when the price of a tulip is at or above ${numberFormat.format(price)} meat.`,
  );
}

async function checkPrices() {
  const page = await visitFlowerTradeIn();
  const prices = parsePrices(page);
  if (!prices) return null;

  const lastPrices = await prisma.flowerPrices.findFirst({
    orderBy: { createdAt: "desc" },
  });

  // Return if we already have these prices
  if (
    lastPrices &&
    lastPrices.red === prices.red &&
    lastPrices.white === prices.white &&
    lastPrices.blue === prices.blue
  )
    return prices;

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

  return prices;
}

export function init() {
  discordClient.once(
    Events.ClientReady,
    () => void setInterval(() => void checkPrices(), milliseconds(CHECK_DURATION)),
  );
}
