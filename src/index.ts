import { DiscordClient } from "./discord";
import { WikiSearcher } from "./wikisearch";
import { attachMiscCommands } from "./misccommands";
import { KOLClient } from "./kolclient";
import { attachClanCommands } from "./raidlogs";
import * as dotenv from "dotenv";
import { attachKoLCommands } from "./kolcommands";
import { Client } from "pg";
import { migrate } from "postgres-migrations";

dotenv.config({ path: __dirname + "/.env" });

console.log("Creating KOL client.");
const kolClient = new KOLClient();

console.log("Creating database client.");
const databaseClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log("Creating wiki searcher.");
const wikiSearcher = new WikiSearcher(kolClient);

console.log("Connecting to database.");
databaseClient.connect().then(() => {
  console.log("Migrating database.");
  migrate({ client: databaseClient }, "./migrations").then(() => {
    console.log("Downloading mafia data.");
    wikiSearcher.downloadMafiaData().then(() => {
      console.log("All mafia data downloaded.");
      console.log("Creating discord client.");
      const discordClient = new DiscordClient(wikiSearcher);
      console.log("Attaching misc commands.");
      attachMiscCommands(discordClient);
      console.log("Attaching kol commands.");
      attachKoLCommands(discordClient);
      console.log("Attaching clan commands.");
      attachClanCommands(discordClient, kolClient, databaseClient);
      console.log("Attaching wiki commands.");
      discordClient.attachMetaBotCommands();

      console.log("Starting bot.");
      discordClient.start();
    });
  });
});
