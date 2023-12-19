import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const data = new SlashCommandBuilder()
  .setName("automatedfuture")
  .setDescription("Find information about the current TTT Level 9 status");

async function visitTTT(): Promise<string> {
  return await kolClient.actionMutex.runExclusive(async () => {
    await kolClient.visitUrl("town.php");
    return kolClient.visitUrl("place.php?whichplace=twitch");
  });
}

export function parseScores(page: string) {
  const pattern = /title='(-?\d+)' href=adventure.php\?snarfblat=(581|582)/gs;
  const matches = [...page.matchAll(pattern)];

  if (matches.length !== 2) return null;

  const scores = matches.reduce(
    (acc, m) => ({ ...acc, [m[2]]: Number(m[1]) }),
    {} as Record<string, number>,
  );

  return {
    solenoids: scores["581"] ?? 0,
    bearings: scores["582"] ?? 0,
  };
}

const numberFormat = new Intl.NumberFormat();

const formatWinner = (predicate: boolean, text: string) =>
  predicate ? bold(text) : text;

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const page = await visitTTT();

  if (page.includes("faded back into the swirling mists"))
    return void (await interaction.editReply(
      "The Time-Twitch Tower has faded back into the swirling mists.",
    ));

  const scores = parseScores(page);

  if (!scores)
    return void (await interaction.editReply(
      "I wasn't able to read the current scores",
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
