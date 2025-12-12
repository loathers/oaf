import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { discordClient } from "../../clients/discord.js";

const getOwnUserId = () => discordClient.user?.id;

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Purges the last <count> messages from me in this channel.")
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Quantity of messages to purge (default 1)")
      .setRequired(false)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const channel = interaction.channel;

  if (!channel) {
    await interaction.editReply(
      "You have to perform this action from within a channel.",
    );
    return;
  }

  if (!("messages" in channel) || channel.isDMBased()) {
    await interaction.editReply(
      "The channel type supplied does not support purging.",
    );
    return;
  }

  const quantity = interaction.options.getInteger("count", false) || 1;

  const messagesToDelete = [];

  const messages = await channel.messages.fetch();

  for (const [messageId, message] of messages.sorted(
    (a, b) => b.createdTimestamp - a.createdTimestamp,
  )) {
    // If we have queued enough messages for deletion, end the loop
    if (messagesToDelete.length >= quantity) break;

    // Only consider messages from OAF
    if (message.author.id !== getOwnUserId()) continue;

    // If the message is a slash command interaction, was it was initiated by the user?
    const originator = message.interactionMetadata?.user.id;
    if (originator === interaction.user.id) {
      messagesToDelete.push(messageId);
      continue;
    }

    // Otherwise, if the message is a reply, was it a reply to the user?
    if (message.mentions.repliedUser?.id === interaction.user.id) {
      messagesToDelete.push(messageId);
      continue;
    }
  }

  await channel.bulkDelete(messagesToDelete);

  await interaction.editReply("Purge complete");
}
