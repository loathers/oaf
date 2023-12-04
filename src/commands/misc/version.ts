import {
  ChatInputCommandInteraction,
  Events,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";
import ms from "pretty-ms";

import { createEmbed, discordClient } from "../../clients/discord.js";

let START_TIME = 0;

export const data = new SlashCommandBuilder()
  .setName("version")
  .setDescription("Get information on the current version of oaf");

function getVersionEmbed() {
  return createEmbed()
    .setTitle(`${inlineCode("oaf")} Status`)
    .addFields(
      {
        name: "Repository",
        value: "https://github.com/loathers/oaf",
      },
      {
        name: "Uptime",
        value: ms(Date.now() - START_TIME),
      },
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  interaction.reply({
    embeds: [getVersionEmbed()],
    ephemeral: true,
  });
}

export async function init() {
  discordClient.on(Events.ClientReady, async () => {
    START_TIME = Date.now();
    discordClient.alert(`${inlineCode("oaf")} started`);
  });

  process.on("SIGTERM", () => {
    discordClient
      .alert(`${inlineCode("oaf")} shutting down`)
      .then(() => process.exit(0));
  });
}
