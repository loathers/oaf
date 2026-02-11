import { Events, blockQuote, inlineCode } from "discord.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";

import { dataOfLoathingClient } from "./clients/dataOfLoathing.js";
import {
  CommandHandler,
  InteractionHandler,
  ModalHandler,
  discordClient,
} from "./clients/discord.js";
import { kolClient } from "./clients/kol.js";
import { handleGreenboxKmail } from "./greenbox.js";
import { startApiServer } from "./server/index.js";

export {};

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

function isCommandHandler(value: object): value is CommandHandler {
  return "data" in value && "execute" in value;
}

function isModalHandler(value: object): value is ModalHandler {
  return "customId" in value && "handle" in value;
}

function isInteractionHandler(value: object): value is InteractionHandler {
  return "init" in value && typeof (value as InteractionHandler).init === "function";
}

async function registerHandler(imported: unknown): Promise<boolean> {
  if (typeof imported !== "object" || imported === null) return false;

  let handled = false;

  if (isCommandHandler(imported)) {
    discordClient.commands.set(imported.data.name, imported);
    handled = true;
  }

  if (isModalHandler(imported)) {
    discordClient.modals.set(imported.customId, imported);
    handled = true;
  }

  if (isInteractionHandler(imported)) {
    await imported.init();
    handled = true;
  }

  return handled;
}

async function loadSlashCommands() {
  const commandsPath = url.fileURLToPath(
    new URL("./commands", import.meta.url),
  );
  for await (const filePath of walk(commandsPath)) {
    if (!/\/[^_][^/]*(?<!\.test)\.(ts|js)$/.test(filePath)) continue;
    const command: unknown = await import(filePath);

    if (!(await registerHandler(command))) {
      await discordClient.alert(
        `Unusable file found in command directory ${filePath}`,
      );
    }
  }

  const commands = [...discordClient.commands.values()].map((c) =>
    c.data.toJSON(),
  );
  await discordClient.registerApplicationCommands(commands);
  console.log(`Loaded ${commands.length} commands`);
}

async function main() {
  console.log("Starting API server");
  startApiServer();

  console.log("Downloading data of loathing");
  await dataOfLoathingClient.load();
  console.log("All data of loathing downloaded.");

  console.log("Loading commands and syncing relevant data");
  await loadSlashCommands();

  // Start chatbot
  await kolClient.startChatBot();

  // Tell us when you're online!
  discordClient.on(Events.ClientReady, ({ user }) => {
    console.log(`Logged in as ${user.tag}!`);
  });

  // Register message logger
  discordClient.on(Events.MessageCreate, (message) => {
    if (message.content.length === 0) return;
    console.log(
      `[${new Date(message.createdTimestamp).toLocaleTimeString()}]`,
      message.inGuild() ? `#${message.channel.name}` : "DM",
      `${message.author.username}:`,
      `"${message.content}"`,
    );
  });

  kolClient.on("kmail", (message) => {
    void (async () => {
      console.log(
        `Received Kmail from ${message.who.id}: "${message.msg.substring(0, 15)}"${message.msg.length > 15 ? "..." : ""}`,
      );
      if (message.msg.startsWith("GREENBOX:"))
        return await handleGreenboxKmail(message);
      await discordClient.alert(
        `Received Kmail from ${inlineCode(`${message.who.name} (#${message.who.id})`)}\n${blockQuote(message.msg)}`,
      );
    })();
  });

  console.log("Starting bot.");
  discordClient.start();
}

await main();
