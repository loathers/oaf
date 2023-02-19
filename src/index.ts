import "dotenv/config";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { migrate } from "postgres-migrations";

import { pool } from "./db";
import { DiscordClient, discordClient } from "./discord";
import { wikiClient } from "./kol";

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

async function loadSlashCommands(client: DiscordClient) {
  const commandsPath = path.join(__dirname, "commands");
  for await (const filePath of walk(commandsPath)) {
    if (!/\.(ts|js)$/.test(filePath)) continue;
    const command = await import(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);

      if ("sync" in command) {
        await command.sync();
      }
    } else {
      console.warn("Invalid command file found in command directory", filePath);
    }
  }

  const commands = [...client.commands.values()].map((c: any) => c.data.toJSON());
  await client.registerApplicationCommands(commands);
}

async function performSetup(): Promise<DiscordClient> {
  console.log("Migrating database.");
  await migrate({ client: pool }, "./migrations");

  console.log("Downloading mafia data.");
  await wikiClient.downloadMafiaData();
  console.log("All mafia data downloaded.");

  console.log("Loading commands and syncing relevant data");
  await loadSlashCommands(discordClient);

  return discordClient;
}

performSetup().then((discordClient) => {
  console.log("Starting bot.");
  discordClient.start();
});
