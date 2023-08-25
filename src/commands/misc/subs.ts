import {
  ApplicationCommandPermissionType,
  ChatInputCommandInteraction,
  Client,
  Events,
  GuildMemberRoleManager,
  SlashCommandBuilder,
  messageLink,
  roleMention,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";

const PLAYER_DEV_ROLE_ID = process.env.PLAYER_DEV_ROLE_ID!;
const SUBSCRIBER_ROLE_ID = process.env.SUBSCRIBER_ROLE_ID!;
const IOTM_CHANNEL_ID = process.env.IOTM_CHANNEL_ID!;
const GUILD_ID = process.env.GUILD_ID!;

const COMMAND_KEY = "lastSubPing";

const COMMAND_NAME = "subs";

type CommandValue = { lastTime: number; lastPlayer: string };

export const data = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription("Pings users to let them know that subs are rolling")
  .setDefaultMemberPermissions(0);

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

async function setPermissionsForCommand(client: Client) {
  try {
    const oauthToken = await discordClient.getOauthToken();

    const commands = client.application?.commands;

    if (!commands) throw new Error("No commands found");

    await commands.fetch();
    const command = commands.cache.find((c) => c.name === COMMAND_NAME);

    if (!command) throw new Error("Couldn't find command");

    await commands.permissions.add({
      guild: GUILD_ID,
      command: command.id,
      token: oauthToken,
      permissions: [
        {
          id: PLAYER_DEV_ROLE_ID,
          type: ApplicationCommandPermissionType.Role,
          permission: true,
        },
      ],
    });
  } catch (error) {
    await discordClient.alert("Failed to add permissions to /subs command", undefined, error);
  }
}

export async function init() {
  discordClient.on(Events.ClientReady, setPermissionsForCommand);
}
