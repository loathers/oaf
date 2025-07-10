import {
  ChatInputCommandInteraction,
  MessageType,
  SlashCommandBuilder,
} from "discord.js";

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

  const toDelete = [];

  for (const [messageId, message] of (await channel.messages.fetch()) ?? []) {
    // If we have queued enough messages for deletion, end the loop
    if (toDelete.length >= quantity) break;

    // Only consider messages from OAF
    if (message.author.id !== getOwnUserId()) continue;

    // Only consider messages that are a reply to the purging user
    const originatorId = message.interactionMetadata?.interactedMessageId;
    if (!originatorId) continue;
    const originator = await channel.messages.fetch(originatorId);
    if (!originator) continue;
    if (originator.author.id !== interaction.user.id) continue;

    // If we got here, we have a message to delete
    toDelete.push(messageId);
  }

  await channel.bulkDelete(toDelete);

  await interaction.editReply("Purge complete");
}
