import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachMiscCommands, syncReminders } from "./misccommands";
import { KOLClient } from "./kolclient";
import { attachClanCommands, syncToDatabase } from "./raidlogs";
import * as dotenv from "dotenv";
import { attachKoLCommands } from "./kolcommands";
import { Pool } from "pg";
import { migrate } from "postgres-migrations";

async function performSetup(): Promise<DiscordClient> {
  console.log("Creating KOL client.");
  const kolClient = new KOLClient();

  console.log("Creating database client pool.");
  const databaseClientPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log("Creating wiki searcher.");
  const wikiSearcher = new WikiSearcher(kolClient);

  console.log("Migrating database.");
  await migrate({ client: databaseClientPool }, "./migrations");

  console.log("Syncing database.");
  await syncToDatabase(databaseClientPool);

  console.log("Downloading mafia data.");
  await wikiSearcher.downloadMafiaData();
  console.log("All mafia data downloaded.");

  console.log("Creating discord client.");
  const discordClient = new DiscordClient(wikiSearcher);

  console.log("Attaching misc commands.");
  attachMiscCommands(discordClient, databaseClientPool);

  console.log("Attaching kol commands.");
  attachKoLCommands(discordClient, kolClient);

  console.log("Attaching clan commands.");
  attachClanCommands(discordClient, kolClient, databaseClientPool);

  console.log("Attaching wiki commands.");
  discordClient.attachMetaBotCommands();

  console.log("Syncing reminders.");
  await syncReminders(databaseClientPool, discordClient.client());

  await discordClient.registerSlashCommands();

  return discordClient;
}

dotenv.config({ path: __dirname + "/.env" });

performSetup().then((discordClient) => {
  console.log("Starting bot.");
  discordClient.start();
});
