import { DiscordClient } from "./src/clients/discord.ts";
import { WikiClient } from "./src/clients/wiki.ts";

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    discordClient: DiscordClient;
    wikiClient: WikiClient;
  }
}
