import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const data = new SlashCommandBuilder()
  .setName("flowers")
  .setDescription("Find information about the tulip market (from TTT).");

async function visitFlowerTradeIn(): Promise<string> {
  return kolClient.fetchText("shop.php?whichshop=flowertradein");
}

export function parsePrices(page: string) {
  const pattern = /<tr rel="7567">.*?Chroner<\/b>&nbsp;<b>\((\d+)\)<\/b>.*?descitem\((\d+)\).*?<\/tr>/gs;
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

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const page = await visitFlowerTradeIn();

  const prices = parsePrices(page);

  if (!prices)
    return void (await interaction.editReply(
      "I wasn't able to read the current prices from the floral mercantile exchange.",
    ));

  const embed = createEmbed().setTitle(`🌷 The Central Loathing Floral Mercantile Exchange 🌷`);

  embed.addFields([
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

  await interaction.editReply({ content: null, embeds: [embed] });
}
