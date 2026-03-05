import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import jwt from "jsonwebtoken";

import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Administrate OAF.");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) return;

  if (!interaction.member.roles.cache.has(config.EXTENDED_TEAM_ROLE_ID)) {
    await interaction.reply({
      content: "You are not permitted to administrate O.A.F.",
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  const token = jwt.sign(
    {
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
      data: {
        id: interaction.member.user.id,
        name: interaction.member.user.displayName,
        avatar: interaction.member.user.displayAvatarURL(),
      },
    },
    config.SALT,
  );

  await interaction.reply({
    flags: [MessageFlags.Ephemeral],
    content: `https://oaf.loathers.net/login?token=${token}`,
  });
}
