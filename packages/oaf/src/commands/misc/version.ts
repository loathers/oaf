import {
  ChatInputCommandInteraction,
  Events,
  SlashCommandBuilder,
  codeBlock,
  inlineCode,
} from "discord.js";
import ms from "pretty-ms";

import { createEmbed, discordClient } from "../../clients/discord.js";

function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    const inner = error.errors
      .map((e, i) => `${i + 1}. ${e instanceof Error ? e.message : String(e)}`)
      .join("\n");
    return `${error.message}\n${codeBlock(inner)}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

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
    ephemeral: true,
  });
}

export function init() {
  discordClient.on(Events.ClientReady, () => {
    START_TIME = Date.now();
    void discordClient.alert(`${inlineCode("oaf")} started`);
  });

  const shutdown = (signal: string) => {
    void discordClient
      .alert(`${inlineCode("oaf")} shutting down (${signal})`)
      .then(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    void discordClient
      .alert(
        `${inlineCode("oaf")} crashed: ${describeError(err)}`,
        undefined,
        err,
      )
      .then(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason) => {
    void discordClient
      .alert(
        `${inlineCode("oaf")} crashed (unhandled rejection): ${describeError(reason)}`,
        undefined,
        reason,
      )
      .then(() => process.exit(1));
  });
}
