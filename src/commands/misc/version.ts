import { ChatInputCommandInteraction, SlashCommandBuilder, hyperlink } from "discord.js";

import { createEmbed, discordClient } from "../../clients/discord";

import ms = require("ms");

const TEST_CHANNEL_ID = "592805155448029194";
let START_TIME = 0;

export const data = new SlashCommandBuilder()
  .setName("version")
  .setDescription("Get information on the current version of O.A.F.");

function getVersionEmbed() {
  const commit = process.env.HEROKU_SLUG_COMMIT || "";
  return createEmbed()
    .setTitle("O.A.F. Status")
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
      }
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  interaction.reply({
    embeds: [getVersionEmbed()],
    ephemeral: true,
  });
}

export async function init() {
  discordClient.on("ready", async (client) => {
    START_TIME = Date.now();
    const channel = client.channels.cache.find((c) => c.id === TEST_CHANNEL_ID);
    if (!channel || !("send" in channel)) return;
    channel.send({
      content: "O.A.F. started successfully",
      embeds: [getVersionEmbed()],
    });
  });

  process.on("SIGTERM", () => {
    console.log("Shutting down...");
    const channel = discordClient.channels.cache.find((c) => c.id === TEST_CHANNEL_ID);

    if (!channel || !("send" in channel)) {
      console.warn("No channel available to say bye bye");
      process.exit(0);
    }

    channel.send("O.A.F. shutting down...").then(() => process.exit(0));
  });
}
