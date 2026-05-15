import {
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
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
  await interaction.reply({
    embeds: [getVersionEmbed()],
    flags: [MessageFlags.Ephemeral],
  });
}

export function init() {
  discordClient.on(Events.ClientReady, () => {
    START_TIME = Date.now();
    void discordClient.alert(`${inlineCode("oaf")} started`);
  });
}
