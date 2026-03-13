import { milliseconds } from "date-fns";
import {
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import {
  FloralMercantileExchange,
  type FlowerPrices,
} from "kol.js/domains/FloralMercantileExchange";

import {
  createFlowerPrices,
  deleteFlowerAlert,
  findPlayerByDiscordId,
  getLatestFlowerPrices,
  getTriggeredAlerts,
  upsertFlowerAlert,
} from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

const CHECK_DURATION = { minutes: 1 };
const floralExchange = new FloralMercantileExchange(kolClient);

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

const numberFormat = new Intl.NumberFormat();

function createPriceEmbed(prices: FlowerPrices) {
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
        flags: [MessageFlags.Ephemeral],
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
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const price = interaction.options.getInteger("price", true);

  const player = await findPlayerByDiscordId(interaction.user.id);

  if (!player) {
    return void (await interaction.editReply(
      "You need to link your account first.",
    ));
  }

  if (price === 0) {
    await deleteFlowerAlert(player.playerId);
    return void (await interaction.editReply("Removed your price alert."));
  }

  await upsertFlowerAlert(player.playerId, price);

  return await interaction.editReply(
    `You will be alerted when the price of a tulip is at or above ${numberFormat.format(price)} Meat.`,
  );
}

async function checkPrices() {
  let prices: FlowerPrices;
  try {
    prices = await floralExchange.getPrices();
  } catch {
    return null;
  }

  const lastPrices = await getLatestFlowerPrices();

  // Return if we already have these prices
  if (
    lastPrices &&
    lastPrices.red === prices.red &&
    lastPrices.white === prices.white &&
    lastPrices.blue === prices.blue
  )
    return prices;

  await createFlowerPrices(prices);

  const alertees = await getTriggeredAlerts(prices);

  for (const { price, discordId } of alertees) {
    if (!discordId) continue;
    const user = await discordClient.users.fetch(discordId);
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
    () =>
      void setInterval(() => void checkPrices(), milliseconds(CHECK_DURATION)),
  );
}
