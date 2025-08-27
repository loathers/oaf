import type { Config } from "@react-router/dev/config";
import { DiscordClient } from "./src/clients/discord.js";
import { WikiClient } from "./src/clients/wiki.js";

declare module "react-router" {
  interface Future {
    unstable_middleware: true;
  }
  interface unstable_RouterContextProvider {
    discordClient: DiscordClient;
    wikiClient: WikiClient;
  }
}

export default {
  appDirectory: "src/server/web",
  future: {
    unstable_middleware: true,
  }
} satisfies Config;
