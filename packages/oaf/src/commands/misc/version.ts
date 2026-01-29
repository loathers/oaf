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

  const shutdown = (signal: string) => {
    discordClient
      .alert(`${inlineCode("oaf")} shutting down (${signal})`)
      .then(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    discordClient
      .alert(`${inlineCode("oaf")} crashed: ${err.message}`)
      .then(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error ? reason.message : "Unknown rejection";
    discordClient
      .alert(`${inlineCode("oaf")} crashed (unhandled rejection): ${message}`)
      .then(() => process.exit(1));
  });
}
