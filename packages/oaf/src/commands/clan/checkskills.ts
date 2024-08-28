import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { prisma } from "../../clients/database.js";
import {
  getParticipationFromCurrentRaid,
  mergeParticipation,
  parseOldLogs,
} from "./skills.js";

export const data = new SlashCommandBuilder()
  .setName("checkskills")
  .setDescription("Check what dread skills someone is owed")
  .addStringOption((option) =>
    option
      .setName("who")
      .setDescription("The player id of the user in question")
      .setRequired(true)
      .setMaxLength(30),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const playerId = Number(interaction.options.getString("who", true));
  await interaction.deferReply();

  const player = await prisma.player.findFirst({ where: { playerId } });

  if (!player) {
    return void (await interaction.editReply(
      `Unable to find player with id ${playerId}`,
    ));
  }

  const lines: string[] = [];

  try {
    if (player.doneWithSkills) lines.push("Player is done with skills");
    await parseOldLogs();

    const { kills, skills } = mergeParticipation(
      new Map([[playerId, player]]),
      await getParticipationFromCurrentRaid(),
    ).get(playerId)!;

    lines.push(`Across all registered raids, player has done ${kills} kills`);
    lines.push(
      `Across all registered raids, player has gained ${skills} skills`,
    );
    lines.push(
      `Doing the math, they are owed ${Math.floor((kills + 450) / 900) - skills} skills`,
    );
  } catch (e) {
    return void (await interaction.editReply(`Uh oh: ${e}`));
  }

  return void (await interaction.editReply(lines.join("\n")));
}
