import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { migrate } from "postgres-migrations";

import { databaseClient } from "./clients/database";
import { Command, discordClient } from "./clients/discord";
import { wikiClient } from "./clients/wiki";

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

async function loadSlashCommands() {
  const commandsPath = path.join(__dirname, "commands");
  for await (const filePath of walk(commandsPath)) {
    if (!/\/[^_][^\/]*.(ts|js)$/.test(filePath)) continue;
    const command: Command = await import(filePath);
    if ("data" in command && "execute" in command) {
      discordClient.commands.set(command.data.name, command);
      await command.init?.();
    } else {
      console.warn("Invalid command file found in command directory", filePath);
    }
  }

  const commands = [...discordClient.commands.values()].map((c: any) => c.data.toJSON());
  await discordClient.registerApplicationCommands(commands);
  console.log(`Loaded ${commands.length} commands`);
}

async function performSetup() {
  console.log("Migrating database.");
  await migrate({ client: databaseClient }, "./migrations");

  console.log("Downloading mafia data.");
  await wikiClient.loadMafiaData();
  console.log("All mafia data downloaded.");

  console.log("Loading commands and syncing relevant data");
  await loadSlashCommands();

  // Tell us when you're online!
  discordClient.on("ready", ({ user }) => {
    console.log(`Logged in as ${user.tag}!`);
  });

  // Register message logger
  discordClient.on("messageCreate", async (message) => {
    if (message.content.length === 0) return;
    console.log(
      new Date(message.createdTimestamp).toLocaleTimeString(),
      message.author.username,
      `said "${message.content}" in channel ${message.channel}`
    );
  });

  return discordClient;
}

performSetup().then((discordClient) => {
  console.log("Starting bot.");
  discordClient.start();
});
