import { Events } from "discord.js";
import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

import { prisma } from "./clients/database.js";
import { CommandHandler, ModalHandler, discordClient } from "./clients/discord.js";
import { kolClient } from "./clients/kol.js";
import { wikiClient } from "./clients/wiki.js";
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

  console.log("Downloading mafia data.");
  await wikiClient.loadMafiaData();
  console.log("All mafia data downloaded.");

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
      new Date(message.createdTimestamp).toLocaleTimeString(),
      message.author.username,
      `said "${message.content}" in channel ${message.channel}`
    );
  });

  // Collect greenbox submissions
  kolClient.on("kmail", async (message) => {
    if (!message.msg.startsWith("GREENBOX:")) return;

    const text = message.msg.replace(/ /g, "").slice(9);

    const greenboxLastUpdate = new Date();

    try {
      await prisma.player.upsert({
        where: { playerId: message.who.id },
        update: { greenboxString: text, greenboxLastUpdate },
        create: {
          playerId: message.who.id,
          playerName: message.who.name,
          greenboxString: text,
          greenboxLastUpdate,
        },
      });
    } catch (error) {
      await kolClient.kmail(
        message.who.id,
        "There was an error processing your greenbox submission"
      );
    }
  });

  console.log("Starting bot.");
  discordClient.start();
}

main();
