import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { discordClient } from "../../discord";

const getOwnUserId = () => discordClient.client().user?.id;

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Purges the last x messages from OAF in this channel.")
  .addIntegerOption((option) =>
    option
      .setName("count")
      .setDescription("Quantity of messages to purge (default 1)")
      .setRequired(false)
  );

export async function execute(interaction: CommandInteraction) {
  const channel = interaction.channel;

  if (!channel) {
    interaction.reply({
      content: "You have to perform this action from within a Channel.",
      ephemeral: true,
    });
    return;
  }

  const quantity = interaction.options.getInteger("count", false) || 1;

  let purged = 0;
  if (quantity > 0) {
    for (let message of (await channel.messages.fetch()) ?? []) {
      if (message[1].author.id === getOwnUserId()) {
        await message[1].delete();
        purged += 1;
        if (purged >= quantity) break;
      }
    }
  }

  interaction.reply({ content: "Purge complete", ephemeral: true });
}
