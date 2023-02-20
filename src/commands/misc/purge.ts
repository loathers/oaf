import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { discordClient } from "../../clients/discord";

const getOwnUserId = () => discordClient.client().user?.id;

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
  const channel = interaction.channel;

  if (!channel) {
    interaction.reply({
      content: "You have to perform this action from within a Channel.",
      ephemeral: true,
    });
    return;
  }

  if (!("messages" in channel)) {
    interaction.reply({
      content: "The channel type supplied does not support purging.",
      ephemeral: true,
    });
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

  interaction.reply({ content: "Purge complete", ephemeral: true });
}
