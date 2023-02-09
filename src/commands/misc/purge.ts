import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, TextChannel } from "discord.js";

import { DiscordClient } from "../../discord";

import { Command } from "../type";

async function purge(
  interaction: CommandInteraction,
  channel: TextChannel,
  client: DiscordClient,
  quantity: number
): Promise<void> {
  let purged = 0;
  if (quantity > 0) {
    for (let message of await channel.messages.fetch()) {
      if (message[1].author.id === client?.client()?.user?.id) {
        await message[1].delete();
        purged += 1;
        if (purged >= quantity) break;
      }
    }
  }
  interaction.reply({ content: "Purge complete", ephemeral: true });
}

const command: Command = {
  attach: ({ discordClient }) => {
    discordClient.attachCommand(
      "purge",
      [
        {
          name: "count",
          description: "Quantity of messages to purge",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
      async (interaction: CommandInteraction) =>
        await purge(
          interaction,
          interaction.channel as TextChannel,
          discordClient,
          interaction.options.getInteger("count", true)
        ),
      "Purges the last x messages from OAF in this channel."
    );
    discordClient.attachCommand(
      "oops",
      [],
      async (interaction: CommandInteraction) =>
        await purge(interaction, interaction.channel as TextChannel, discordClient, 1),
      "Purges OAF's last message in this channel."
    );
  },
};

export default command;
