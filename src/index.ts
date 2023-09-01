import { Events } from "discord.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

import { CommandHandler, ModalHandler, discordClient } from "./clients/discord.js";
import { kolClient } from "./clients/kol.js";
import { wikiClient } from "./clients/wiki.js";
import { handleGreenboxKmail } from "./greenbox.js";
import { startApiServer } from "./server.js";

export {};

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

async function loadSlashCommands() {
  const commandsPath = url.fileURLToPath(new URL("./commands", import.meta.url));
  for await (const filePath of walk(commandsPath)) {
    if (!/\/[^_][^/]*(?<!\.test)\.(ts|js)$/.test(filePath)) continue;
    let handled = false;
    const command: CommandHandler | ModalHandler = await import(filePath);

    if ("data" in command) {
      if ("execute" in command) {
        discordClient.commands.set(command.data.name, command);
      }
      await command.init?.();
      handled = true;
    }

    if ("customId" in command) {
      discordClient.modals.set(command.customId, command);
      handled = true;
    }

    if (!handled) {
      await discordClient.alert(`Unusable file found in command directory ${filePath}`);
    }
  }

  const commands = [...discordClient.commands.values()].map((c) => c.data.toJSON());
  await discordClient.registerApplicationCommands(commands);
  console.log(`Loaded ${commands.length} commands`);
}

async function main() {
  console.log("Starting API server");
  startApiServer();

  console.log("Downloading KoLmafia data.");
  await wikiClient.loadMafiaData();
  console.log("All KoLmafia data downloaded.");

  console.log("Loading commands and syncing relevant data");
  await loadSlashCommands();

  // Start chatbot
  kolClient.startChatBot();

  // Tell us when you're online!
  discordClient.on(Events.ClientReady, ({ user }) => {
    console.log(`Logged in as ${user.tag}!`);
  });

  // Register message logger
  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.content.length === 0) return;
    console.log(
      `[${new Date(message.createdTimestamp).toLocaleTimeString()}]`,
      message.inGuild() ? `#${message.channel.name}` : "DM",
      `${message.author.username}:`,
      `"${message.content}"`,
    );
  });

  kolClient.on("kmail", async (message) => {
    if (message.msg.startsWith("GREENBOX:")) await handleGreenboxKmail(message);
  });

  console.log("Starting bot.");
  discordClient.start();
}

main();
