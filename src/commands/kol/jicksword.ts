import {
  bold,
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { SwordOfProceduralGeneration } from "kol.js/domains/SwordOfProceduralGeneration";

import { createEmbed } from "../../clients/discord.js";
import { identifyPlayerOrSelf } from "../_player.js";

export const data = new SlashCommandBuilder()
  .setName("jicksword")
  .setDescription(
    "Find the modifiers on a player's Sword of Procedural Generation.",
  )
  .addStringOption((option) =>
    option
      .setName("player")
      .setDescription(
        "The name or id of the KoL player, or a mention of a Discord user. Defaults to you.",
      )
      .setRequired(false)
      .setMaxLength(30),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const identification = await identifyPlayerOrSelf(interaction);

  if (typeof identification === "string") {
    await interaction.editReply(identification);
    return;
  }

  const [player] = identification;

  const modifiers = SwordOfProceduralGeneration.getModifiers(player.id);

  const embed = createEmbed()
    .setTitle(`${player.name} (#${player.id})'s Sword of Procedural Generation`)
    .setDescription(
      modifiers.map((m) => `${bold(m.name)}: ${m.value}`).join("\n"),
    );

  await interaction.editReply({ content: null, embeds: [embed] });
}
