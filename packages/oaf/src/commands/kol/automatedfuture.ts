import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
} from "discord.js";
import { AutomatedFuture } from "kol.js/domains/AutomatedFuture";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const data = new SlashCommandBuilder()
  .setName("automatedfuture")
  .setDescription("Find information about the current TTT Level 9 status");

const automatedFuture = new AutomatedFuture(kolClient);

const numberFormat = new Intl.NumberFormat();

const formatWinner = (predicate: boolean, text: string) =>
  predicate ? bold(text) : text;

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const scores = await automatedFuture.getScores();

  if (scores === null)
    return void (await interaction.editReply(
      "The Time-Twitch Tower has faded back into the swirling mists, or I wasn't able to read the current scores.",
    ));

  const embed = createEmbed().setTitle(`Automated Future`);

  embed.addFields([
    {
      name: formatWinner(
        scores.solenoids > scores.bearings,
        "Spring Bros. Solenoids",
      ),
      value: numberFormat.format(scores.solenoids),
    },
    {
      name: formatWinner(
        scores.bearings > scores.solenoids,
        "Boltsmann Bearings",
      ),
      value: numberFormat.format(scores.bearings),
    },
  ]);

  await interaction.editReply({ content: null, embeds: [embed] });
}
