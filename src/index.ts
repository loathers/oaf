import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { migrate } from "postgres-migrations";

import commands from "./commands";
import { pool } from "./db";
import { DiscordClient, discordClient } from "./discord";
import { client as kolClient, wikiClient } from "./kol";

dotenv.config();

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
    }
  }

  // const commands = [...client.commands.values()].map((c: any) => c.data.toJSON());
  // await client.registerApplicationCommands(commands);
}

async function performSetup(): Promise<DiscordClient> {
  console.log("Migrating database.");
  await migrate({ client: pool }, "./migrations");

  console.log("Downloading mafia data.");
  await wikiClient.downloadMafiaData();
  console.log("All mafia data downloaded.");

  const args = { discordClient, kolClient, wikiSearcher: wikiClient, databasePool: pool };

  await loadSlashCommands(discordClient);

  console.log("Loading commands and syncing relevant data");
  for (const command of Object.values(commands)) {
    command.attach(args);
    if (command.sync) {
      await command.sync(args);
    }
  }

  console.log("Registering slash commands.");
  await discordClient.registerSlashCommands();

  return discordClient;
}

performSetup().then((discordClient) => {
  console.log("Starting bot.");
  discordClient.start();
});
