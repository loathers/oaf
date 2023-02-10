import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { KoLClient } from "./kol";
import * as dotenv from "dotenv";
import commands from "./commands";
import { Pool } from "pg";
import { migrate } from "postgres-migrations";

async function performSetup(): Promise<DiscordClient> {
  console.log("Creating KOL client.");
  const kolClient = new KoLClient();

  console.log("Creating database client pool.");
  const databasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
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

dotenv.config({ path: __dirname + "/.env" });

performSetup().then((discordClient) => {
  console.log("Starting bot.");
  discordClient.start();
});
