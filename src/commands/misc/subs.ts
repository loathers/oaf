import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
  roleMention,
} from "discord.js";

const PLAYER_DEV_ROLE_ID = process.env.PLAYER_DEV_ROLE_ID!;
const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;

export const data = new SlashCommandBuilder()
  .setName("subsrolling")
  .setDescription("Pings users to let them know that subs are rolling");

export function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;

  if (!member) {
    interaction.reply({
      content: "You have to perform this action from within a Guild.",
      ephemeral: true,
    });
    return;
  }

  const roleManager = member.roles as GuildMemberRoleManager;

  if (!roleManager.cache.has(PLAYER_DEV_ROLE_ID)) {
    interaction.reply({
      content: "You are not permitted to blow the Gjallarhorn.",
      ephemeral: true,
    });
    return;
  }

  interaction.reply({
    content: `Attention ${roleMention(SUBSCRIBER_ROLE_ID)}, ${
      member.user.username
    } has blown the Gjallarhorn! Subs are rolling!`,
    allowedMentions: {
      roles: [SUBSCRIBER_ROLE_ID],
    },
  });
}
