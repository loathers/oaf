import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
  roleMention,
} from "discord.js";

import { prisma } from "../../clients/database.js";

const PLAYER_DEV_ROLE_ID = process.env.PLAYER_DEV_ROLE_ID!;
const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;

const COMMAND_KEY = "LAST_SUB_PING";

export const data = new SlashCommandBuilder()
  .setName("subsrolling")
  .setDescription("Pings users to let them know that subs are rolling");

export async function execute(interaction: ChatInputCommandInteraction) {
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

  const last = await prisma.settings.findUnique({
    where: {
      key: COMMAND_KEY,
    },
  });

  const { lastTime, lastPlayer } = JSON.parse(
    (last?.value as string) ?? `{"lastTime":0,"lastPlayer":"nobody"}`,
  );

  if (Date.now() - Number(lastTime) <= 1000 * 60 * 60 * 24) {
    interaction.reply({
      ephemeral: true,
      content: `Sorry bucko, looks like ${lastPlayer} already sounded the Gjallarhorn too recently.`,
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

  const data = {
    key: COMMAND_KEY,
    value: { lastPlayer: interaction.user.username, lastTime: Date.now() },
  };
  if (last) {
    await prisma.settings.update({
      where: {
        key: COMMAND_KEY,
      },
      data,
    });
  } else {
    await prisma.settings.create({ data });
  }
}
