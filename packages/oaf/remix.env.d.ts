import { DataOfLoathingClient } from "./src/clients/dataOfLoathing.ts";
import { DiscordClient } from "./src/clients/discord.ts";

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    discordClient: DiscordClient;
    dataOfLoathingClient: DataOfLoathingClient;
  }
}
