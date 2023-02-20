import { ChatInputCommandInteraction, SlashCommandBuilder, hyperlink } from "discord.js";

import { createEmbed } from "../../clients/discord";
import { pizzaTree } from "../../clients/pizza";
import { wikiClient } from "../../clients/wiki";

export const data = new SlashCommandBuilder()
  .setName("pizza")
  .setDescription("Find what effects a diabolic pizza with the given letters can grant you.")
  .addStringOption((option) =>
    option
      .setName("letters")
      .setDescription("The first letters of the items you want to bake into a pizza.")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(4)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const letters = interaction.options.getString("letters", true);

  await interaction.deferReply();

  const [options, functionalLetters] = pizzaTree.findPizzas(letters.toLowerCase());

  const pizzaName = letters.toUpperCase().padEnd(4, "✱");
  const functionalName = letters.slice(0, functionalLetters).toUpperCase().padEnd(4, "✱");
  const article = letters.match(/^[aeiouAEIOU]/) ? "An" : "A";

  if (options.length === 1) {
    const name = options[0].name();

    return interaction.editReply({
      content: null,
      embeds: [(await wikiClient.getEmbed(name)) || createEmbed()],
      allowedMentions: {
        parse: [],
      },
    });
  }

  const embed = createEmbed().setTitle(`Possible ${pizzaName} Pizza effects`);

  if (options.length > 11) {
    embed.setDescription(
      `${article} ${pizzaName}${
        functionalLetters < letters.length ? ` (functionally ${functionalName})` : ""
      } pizza has too many possible effects to list.`
    );
  } else {
    const description: string[] = await Promise.all(
      options.map(async (effect) => {
        const foundName = await wikiClient.findName(effect.name());
        return hyperlink(foundName?.name ?? "", encodeURI(foundName?.url || ""));
      })
    );

    if (functionalLetters < letters.length) {
      description.unshift(
        `(Note: ${article} ${pizzaName} pizza functions as ${article.toLowerCase()} ${functionalName} pizza)`
      );
    }

    embed.setDescription(description.join("\n"));
  }

  return interaction.editReply({
    content: null,
    embeds: [embed],
    allowedMentions: {
      parse: [],
    },
  });
}
