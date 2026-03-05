import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  hyperlink,
} from "discord.js";
import {
  Bookmobile,
  BookmobileNotInTownError,
  BookmobileParseError,
} from "kol.js/domains/Bookmobile";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const data = new SlashCommandBuilder()
  .setName("bookmobile")
  .setDescription("Find information about the current bookmobile status");

const bookmobile = new Bookmobile(kolClient);
const numberFormat = new Intl.NumberFormat();

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const info = await bookmobile.visit();

    const embed = createEmbed().setTitle(`The Bookmobile`);

    const item = dataOfLoathingClient.findThingByName(info.title);
    let itemInfo = info.title;

    if (item) {
      item.addImageToEmbed(embed);
      const link = dataOfLoathingClient.getWikiLink(item);
      if (link) itemInfo = hyperlink(item.name, link);
    }

    embed.addFields([
      { name: "Book", value: itemInfo },
      { name: "Copies left", value: info.copies },
      {
        name: "Current price",
        value: `${numberFormat.format(info.price)} 🥩`,
      },
    ]);

    await interaction.editReply({ content: null, embeds: [embed] });
  } catch (error) {
    if (error instanceof BookmobileNotInTownError) {
      await interaction.editReply("The Bookmobile doesn't seem to be in town!");
      return;
    }
    if (error instanceof BookmobileParseError) {
      await interaction.editReply(
        "I wasn't able to understand what The Bookmobile bro said",
      );
      return;
    }
    throw error;
  }
}
