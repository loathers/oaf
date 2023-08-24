import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
  roleMention,
} from "discord.js";

import { prisma } from "../../clients/database.js";

const PLAYER_DEV_ROLE_ID = process.env.PLAYER_DEV_ROLE_ID!;
const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;

const COMMAND_KEY = "lastSubPing";

type CommandValue = { lastTime: number; lastPlayer: string };

export const data = new SlashCommandBuilder()
  .setName("subs")
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
      content: "You are not permitted to announce sandwich rotation of any sort.",
      ephemeral: true,
    });
    return;
  }

  const last = (await prisma.settings.findUnique({
    where: {
      key: COMMAND_KEY,
    },
  })) as { key: string; value: CommandValue } | null;

  if (last && Date.now() - Number(last.value.lastTime) <= 1000 * 60 * 60 * 24) {
    interaction.reply({
      ephemeral: true,
      content: `Sorry bucko, looks like ${last.value.lastPlayer} already sent the Red October on a barrel roll, if you catch my drift.`,
    });
    return;
  }

  await interaction.reply({
    content: `Attention ${roleMention(
      SUBSCRIBER_ROLE_ID,
    )}! A member of the /dev team has kindly indicated that subscriptions are now rolling.`,
    allowedMentions: {
      parse: ["roles"],
    },
  });

  const value = { lastPlayer: interaction.user.username, lastTime: Date.now() };

  await prisma.settings.upsert({
    where: {
      key: COMMAND_KEY,
    },
    update: {
      value,
    },
    create: {
      key: COMMAND_KEY,
      value,
    },
  });
}
