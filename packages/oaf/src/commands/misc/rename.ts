import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
} from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("rename")
  .setDescription("Renames our beloved O.A.F.")
  .addStringOption((o) =>
    o
      .setName("name")
      .setDescription("Our beloved O.A.F.'s new name")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;

  if (!member) {
    return void await interaction.reply({
      content: "You have to perform this action from within a Guild.",
      ephemeral: true,
    });
  }

  const roleManager = member.roles as GuildMemberRoleManager;

  if (!roleManager.cache.has(config.EXTENDED_TEAM_ROLE_ID)) {
    return void await interaction.reply({
      content: "You are not permitted to rename me, your beloved O.A.F.",
      ephemeral: true,
    });
  }

  const name = interaction.options.getString("name", true);
  const oaf = discordClient.member;

  if (!oaf) {
    return void (await discordClient.alert(
      "Unfortunately, O.A.F. does not exist.",
    ));
  }

  await oaf.setNickname(name);

  if (oaf.nickname !== name) {
    await discordClient.alert(
      `${interaction.user.username} tried to change O.A.F.'s name to ${name}, but failed!`,
    );
    return void await interaction.reply({
      content: "Sorry, that command didn't work. My name is still my name.",
      ephemeral: true,
    });
  }

  return void (await interaction.reply({
    content: `Done! My name is now ${name}`,
    ephemeral: true,
  }));
}
