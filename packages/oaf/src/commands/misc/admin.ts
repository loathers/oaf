import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import jwt from "jsonwebtoken";

import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Administrate OAF.");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) return;
  const member = interaction.member;

  if (!member) {
    await interaction.reply({
      content: "You have to perform this action from within a Guild.",
      ephemeral: true,
    });
    return;
  }

  const roleManager = member.roles;

  if (!roleManager.cache.has(config.EXTENDED_TEAM_ROLE_ID)) {
    await interaction.reply({
      content: "You are not permitted to administrate O.A.F.",
      ephemeral: true,
    });
    return;
  }

  const token = jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
      data: {
        id: member.user.id,
        name: member.user.displayName,
        avatar: member.user.displayAvatarURL(),
      },
    },
    config.SALT,
  );

  await interaction.reply({
    ephemeral: true,
    content: `https://oaf.loathers.net/login?token=${token}`,
  });
}
