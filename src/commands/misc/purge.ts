import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { discordClient } from "../../clients/discord";

const getOwnUserId = () => discordClient.user?.id;

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Purges the last x messages from OAF in this channel.")
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Quantity of messages to purge (default 1)")
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const channel = interaction.channel;

  if (!channel) {
    await interaction.editReply("You have to perform this action from within a Channel.");
    return;
  }

  if (!("messages" in channel)) {
    await interaction.editReply("The channel type supplied does not support purging.");
    return;
  }

  const quantity = interaction.options.getInteger("count", false) || 1;

  let purged = 0;

  for (let message of (await channel.messages.fetch()) ?? []) {
    if (purged >= quantity) break;
    if (message[1].author.id === getOwnUserId()) {
      await message[1].delete();
      purged++;
    }
  }

  await interaction.editReply("Purge complete");
}
