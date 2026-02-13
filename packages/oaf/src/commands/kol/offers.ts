import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { resolveKoLImage } from "kol.js";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import {
  countBetterOffers,
  deleteOffer,
  findPlayerByDiscordId,
  getTopOffersForItem,
  upsertOffer,
} from "../../clients/database.js";
import { createEmbed } from "../../clients/discord.js";
import { formatPlayer } from "../../utils.js";
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

  const item = dataOfLoathingClient.findItemById(itemId);

  if (!item) {
    return void (await interaction.editReply(`That item does not exist.`));
  }

  if (!item.tradeable && !item.gift) {
    return void (await interaction.editReply(
      `${item.plural} cannot be traded.`,
    ));
  }

  const offers = (await getTopOffersForItem(item.id, 10)).map(
    (offer) =>
      `${formatPlayer(offer)} buys at ${numberFormat.format(offer.price)} meat`,
  );

  if (offers.length === 0) {
    return void (await interaction.editReply(
      `${item.plural} exist but no-one cares.`,
    ));
  }

  const embed = createEmbed()
    .setTitle(`Standing Offers for ${item.name}`)
    .setURL(dataOfLoathingClient.getWikiLink(item))
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

  const buyer = await findPlayerByDiscordId(interaction.user.id);

  if (!buyer) {
    return void (await interaction.editReply(
      `You must first run /claim to link your Discord and KoL accounts.`,
    ));
  }

  const item = dataOfLoathingClient.findItemById(itemId);

  if (!item) {
    return void (await interaction.editReply(`That item does not exist.`));
  }

  if (!item.tradeable && !item.gift) {
    return void (await interaction.editReply(
      `${item.plural} cannot be traded.`,
    ));
  }

  if (price === 0) {
    const deleted = await deleteOffer(buyer.playerId, itemId);
    if (deleted) {
      await interaction.editReply("Offer removed.");
    } else {
      await interaction.editReply(
        "You don't have an active offer for that item. Please first make an offer so you can enjoy the feeling of removing it.",
      );
    }

    return;
  }

  await upsertOffer(buyer.playerId, itemId, price);

  const betterOffers = await countBetterOffers(itemId, price);

  await interaction.editReply(
    `Offer posted successfully (currently beaten by ${betterOffers.toLocaleString()} offer(s))`,
  );
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  await interaction.respond(itemAutocomplete(interaction.options.getFocused()));
}
