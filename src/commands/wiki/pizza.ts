import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

async function pizzaCommand(interaction: CommandInteraction, wikiSearcher: WikiSearcher) {
  const letters = interaction.options.getString("letters", true);
  if (letters.length < 1 || letters.length > 4) {
    await interaction.reply({
      content: "Invalid pizza length. Please supply a sensible number of letters.",
      ephemeral: true,
    });
    return;
  }
  await interaction.deferReply();
  await interaction.editReply({
    content: null,
    embeds: [await wikiSearcher.getPizzaEmbed(letters.toLowerCase())],
    allowedMentions: {
      parse: [],
    },
  });
}

const command: Command = {
  attach: ({ discordClient, wikiSearcher }) =>
    discordClient.attachCommand(
      "pizza",
      [
        {
          name: "letters",
          description: "The first letters of the items you want to bake into a pizza.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      async (interaction: CommandInteraction) => await pizzaCommand(interaction, wikiSearcher),
      "Find what effects a diabolic pizza with the given letters can grant you."
    ),
};

export default command;
