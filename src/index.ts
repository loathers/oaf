import { Collection } from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Pool } from "pg";
import { migrate } from "postgres-migrations";

import commands from "./commands";
import { DiscordClient } from "./discord";
import { KoLClient } from "./kol";
import { WikiSearcher } from "./wikisearch";

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
    }
  }

  // const commands = [...client.commands.values()].map((c: any) => c.data.toJSON());
  // await client.registerApplicationCommands(commands);
}

async function performSetup(): Promise<DiscordClient> {
  console.log("Creating KoL client.");
  const kolClient = new KoLClient();

  console.log("Creating database client pool.");
  const databasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  console.log("Creating wiki searcher.");
  const wikiSearcher = new WikiSearcher(kolClient);

  console.log("Migrating database.");
  await migrate({ client: databasePool }, "./migrations");

  console.log("Downloading mafia data.");
  await wikiSearcher.downloadMafiaData();
  console.log("All mafia data downloaded.");

  console.log("Creating discord client.");
  const discordClient = new DiscordClient(wikiSearcher);

  const args = { discordClient, kolClient, wikiSearcher, databasePool };

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
