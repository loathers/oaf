import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
  messageLink,
  roleMention,
} from "discord.js";

import { prisma } from "../../clients/database.js";

const PLAYER_DEV_ROLE_ID = process.env.PLAYER_DEV_ROLE_ID!;
const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;
const IOTM_CHANNEL_ID = process.env.IOTM_CHANNEL_ID!;

const COMMAND_KEY = "lastSubPing";

type CommandValue = { lastTime: number; lastPlayer: string };

export const data = new SlashCommandBuilder()
  .setName("subs")
  .setDescription("Pings users to let them know that subs are rolling");

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;

  await interaction.deferReply({ ephemeral: true });

  if (!member) {
    return void (await interaction.editReply({
      content: "You have to perform this action from within a Guild.",
    }));
  }

  const roleManager = member.roles as GuildMemberRoleManager;

  if (!roleManager.cache.has(PLAYER_DEV_ROLE_ID)) {
    return void (await interaction.editReply({
      content: "You are not permitted to announce sandwich rotation of any sort.",
    }));
  }

  const last = (await prisma.settings.findUnique({
    where: {
      key: COMMAND_KEY,
    },
  })) as { key: string; value: CommandValue } | null;

  if (last && Date.now() - Number(last.value.lastTime) <= 1000 * 60 * 60 * 24) {
    return void (await interaction.editReply({
      content: `Sorry bucko, looks like ${last.value.lastPlayer} already sent the Red October on a barrel roll, if you catch my drift.`,
    }));
  }

  const iotmChannel = interaction.guild?.channels.cache.get(IOTM_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    return void (await interaction.editReply({
      content: "Cannot send messages to configured IotM channel",
    }));
  }

  const subRollEmoji = interaction.guild?.emojis.cache.find((e) => e.name === "subsRolling") || "";

  const sentMessage = await iotmChannel.send({
    content: `🚨${subRollEmoji} Attention ${roleMention(
      SUBSCRIBER_ROLE_ID,
    )}! A member of the /dev team has kindly indicated that subscriptions are now rolling ${subRollEmoji}🚨`,
    allowedMentions: {
      roles: [SUBSCRIBER_ROLE_ID],
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

  await interaction.editReply({
    content: `The deed is done: ${messageLink(sentMessage.channelId, sentMessage.id)}`,
  });
}
