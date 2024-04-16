import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  userMention,
} from "discord.js";

import { isRecordNotFoundError, prisma } from "../../clients/database.js";
import { createEmbed } from "../../clients/discord.js";
import { resolveKoLImage } from "../../clients/kol.js";
import { wikiClient } from "../../clients/wiki.js";
import { itemAutocomplete, itemOption } from "../_options.js";

const numberFormat = new Intl.NumberFormat();

export const data = new SlashCommandBuilder()
  .setName("offers")
  .setDescription(
    "Browse and manage standing offers to purchase items in bulk.",
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("view")
      .setDescription("See who purchases a specified item.")
      .addIntegerOption(itemOption()),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("manage")
      .setDescription(
        "Advertise that you purchase a specific item in bulk. Can also be used to reprice or remove (price 0)",
      )
      .addIntegerOption(itemOption())
      .addIntegerOption((option) =>
        option
          .setName("price")
          .setDescription("Price you pay for this item.")
          .setRequired(true)
          .setMinValue(0),
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "view":
      return await viewStandingOffers(interaction);
    case "manage":
      return await manageStandingOffers(interaction);
    default:
      return await interaction.reply({
        content:
          "Invalid subcommand. It shouldn't be possible to see this message. Please report it.",
        ephemeral: true,
      });
  }
}

async function viewStandingOffers(interaction: ChatInputCommandInteraction) {
  const itemId = interaction.options.getInteger("item", true);

  await interaction.deferReply();

  const item = wikiClient.items.find((i) => i.id === itemId);

  if (!item) {
    return void (await interaction.editReply(`That item does not exist.`));
  }

  if (!item.tradeable && !item.gift) {
    return void (await interaction.editReply(
      `${item.pluralName} cannot be traded.`,
    ));
  }

  const offers = (
    await prisma.standingOffer.findMany({
      where: { itemId: item.id, buyer: { discordId: { not: null } } },
      take: 10,
      orderBy: [{ price: "desc" }, { offeredAt: "asc" }],
      include: {
        buyer: true,
      },
    })
  ).map(
    ({ buyer, price }) =>
      `${userMention(buyer.discordId!)} buys at ${numberFormat.format(
        price,
      )} meat`,
  );

  if (offers.length === 0) {
    return void (await interaction.editReply(
      `${item.pluralName} exist but no-one cares.`,
    ));
  }

  const embed = createEmbed()
    .setTitle(`Standing Offers for ${item.name}`)
    .setURL(await wikiClient.getWikiLink(item))
    .setDescription(offers.join("\n"))
    .setThumbnail(resolveKoLImage(item.getImagePath()));

  await interaction.editReply({
    embeds: [embed],
  });
}

async function manageStandingOffers(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const itemId = interaction.options.getInteger("item", true);
  const price = interaction.options.getInteger("price", true);

  const buyer = await prisma.player.findFirst({
    where: { discordId: interaction.user.id },
  });

  if (!buyer) {
    return void (await interaction.editReply(
      `You must first run /claim to link your Discord and KoL accounts.`,
    ));
  }

  const item = wikiClient.items.find((i) => i.id === itemId);

  if (!item) {
    return void (await interaction.editReply(`That item does not exist.`));
  }

  if (!item.tradeable && !item.gift) {
    return void (await interaction.editReply(
      `${item.pluralName} cannot be traded.`,
    ));
  }

  if (price === 0) {
    try {
      await prisma.standingOffer.delete({
        where: {
          buyerId_itemId: {
            buyerId: buyer.playerId,
            itemId,
          },
        },
      });
      await interaction.editReply("Offer removed.");
    } catch (error) {
      if (!isRecordNotFoundError(error)) throw error;
      await interaction.editReply(
        "You don't have an active offer for that item. Please first make an offer so you can enjoy the feeling of removing it.",
      );
    }

    return;
  }

  await prisma.standingOffer.upsert({
    where: {
      buyerId_itemId: {
        buyerId: buyer.playerId,
        itemId,
      },
    },
    update: {
      price,
      offeredAt: new Date(),
    },
    create: {
      buyerId: buyer.playerId,
      itemId,
      price,
    },
  });

  await interaction.editReply("Offer posted successfully!");
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await interaction.respond(itemAutocomplete(interaction.options.getFocused()));
}
