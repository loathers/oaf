import { DiscordClient } from "./src/clients/discord.ts";
import { MafiaClient } from "./src/clients/mafia.ts";

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    discordClient: DiscordClient;
    mafiaDataClient: MafiaClient;
  }
}
