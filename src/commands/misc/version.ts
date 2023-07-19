import {
  ChatInputCommandInteraction,
  Events,
  SlashCommandBuilder,
  hyperlink,
  inlineCode,
} from "discord.js";
import ms from "pretty-ms";

import { createEmbed, discordClient } from "../../clients/discord.js";

let START_TIME = 0;

export const data = new SlashCommandBuilder()
  .setName("version")
  .setDescription("Get information on the current version of oaf");

function getVersionEmbed() {
  const commit = process.env.HEROKU_SLUG_COMMIT || "";
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
      {
        name: "Build Commit",
        value: hyperlink(commit, `https://github.com/loathers/oaf/commit/${commit}`),
      },
      {
        name: "Build Date",
        value: process.env.HEROKU_RELEASE_CREATED_AT || "unknown",
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
    discordClient.alert(`${inlineCode("oaf")} started`, undefined, false);
  });

  process.on("SIGTERM", () => {
    discordClient
      .alert(`${inlineCode("oaf")} shutting down`, undefined, false)
      .then(() => process.exit(0));
  });
}
