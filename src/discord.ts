import axios from "axios";
import {
  Client,
  Message,
  MessageReaction,
  PartialUser,
  User,
  Util,
  Intents,
  PartialMessageReaction,
} from "discord.js";
import { ITEMMATCHER, ROLEMAP } from "./constants";
import { WikiSearcher } from "./wikisearch";

type Command = {
  description: string;
  execute: (message: Message, args: string[]) => void;
};

export class DiscordClient {
  private _client: Client;
  private _wikiSearcher: WikiSearcher;
  private _discordToken: string;
  private _commands: Map<string, Command> = new Map();
  private _commandSymbol: string;

  constructor(wikiSearcher: WikiSearcher) {
    this._client = new Client({
      partials: ["MESSAGE", "REACTION", "USER"],
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
      ],
    });
    this._wikiSearcher = wikiSearcher;
    this._discordToken = process.env.DISCORD_TOKEN || "";
    this._commandSymbol = process.env.COMMAND_SYMBOL || "%%%NO COMMAND SYMBOL SET%%%";

    this._client.on("ready", () => {
      console.log(`Logged in as ${this._client?.user?.tag}!`);
    });
    this._client.on("messageCreate", async (message) => this.onMessage(message));
    this._client.on(
      "messageReactionAdd",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReact(reaction, user)
    );
    this._client.on(
      "messageReactionRemove",
      async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) =>
        this.onReactRemove(reaction, user)
    );
  }

  async onReact(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (reaction.partial || user.partial) {
      try {
        await reaction.fetch();
        await user.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message: ", error);
        return;
      }
    }
    if (!user.partial && reaction.message.channel.id === "741479910886866944") {
      console.log(`Adding role ${reaction.emoji.name} to user ${user.username}`);
      const role = (await reaction.message.guild?.roles.cache)?.get(
        ROLEMAP.get(reaction.emoji.name || "") || ""
      );
      const member = await reaction.message.guild?.members.cache.get(user.id);
      if (role && member) {
        await member?.roles.add(role);
      }
    }
  }

  async onReactRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ): Promise<void> {
    if (reaction.partial || user.partial) {
      try {
        await reaction.fetch();
        await user.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message: ", error);
        return;
      }
    }
    if (!user.partial && reaction.message.channel.id === "741479910886866944") {
      console.log(`Removing role ${reaction.emoji.name} from user ${user.username}`);
      const role = (await reaction.message.guild?.roles.cache)?.get(
        ROLEMAP.get(reaction.emoji.name || "") || ""
      );
      const member = await reaction.message.guild?.members.cache.get(user.id);
      if (role && member) {
        await member?.roles.remove(role);
      }
    }
  }

  async onMessage(message: Message): Promise<void> {
    console.log(
      `${new Date(message.createdTimestamp).toLocaleTimeString()} ${
        message.author.username
      } said "${message.content}" in channel ${message.channel}`
    );
    const content = message.content;
    if (content && !message.author.bot) {
      const matches = [...content.matchAll(ITEMMATCHER)];
      if (matches.length > 3) {
        message.channel.send(
          "Detected too many wiki invocations in one message. Returning first three invocations only."
        );
        matches.length = 3;
      }
      await Promise.all(matches.map((match) => this.wikiSearch(match[1], message)));

      if (!content.startsWith(this._commandSymbol)) return;
      const commandString = content
        .toLowerCase()
        .split(" ")[0]
        .substring(this._commandSymbol.length);
      console.log(`Found command "${commandString}"`);
      const command = this._commands.get(commandString);
      if (command) command.execute(message, content.toLowerCase().split(" "));
      else
        message.channel.send(
          `Command not recognised. Try ${this._commandSymbol}help for a list of all commands.`
        );
    }
  }

  client(): Client {
    return this._client;
  }

  attachCommand(
    command: string,
    functionToCall: (message: Message, args: string[]) => void,
    description: string = ""
  ): void {
    this._commands.set(command.toLowerCase(), {
      description: description,
      execute: functionToCall,
    });
  }

  async pizzaSearch(letters: string, message: Message): Promise<void> {
    if (!letters || letters.length < 1 || letters.length > 4) {
      await message.channel.send(
        "Invalid pizza length. Please supply a sensible number of letters."
      );
      return;
    }
    const searchingMessage = await message.channel.send(`Finding pizzas for "${letters}"...`);
    await searchingMessage.edit({
      content: null,
      embeds: [await this._wikiSearcher.getPizzaEmbed(letters)],
    });
  }

  async wikiSearch(item: string, message: Message): Promise<void> {
    const searchingMessage = await message.channel.send(`Searching for "${item}"...`);
    if (!item.length) {
      await searchingMessage.edit("Need something to search for.");
      return;
    }
    const embed = await this._wikiSearcher.getEmbed(item);
    if (embed) {
      searchingMessage.edit({ content: null, embeds: [embed] });
    } else {
      searchingMessage.edit(`"${item}" wasn't found. Please refine your search.`);
    }
  }

  async mafiawikiSearch(item: string, message: Message): Promise<void> {
    const searchingMessage = await message.channel.send(`Searching for "${item}"...`);
    if (!item.length) {
      await searchingMessage.edit("Need something to search for.");
      return;
    }
    const googleSearchResponse = await axios(`https://www.googleapis.com/customsearch/v1`, {
      params: {
        key: process.env.GOOGLE_API_KEY || "",
        cx: process.env.MAFIA_CUSTOM_SEARCH || "",
        q: item,
      },
    });
    if (googleSearchResponse.data.items.length) {
      searchingMessage.edit({ content: googleSearchResponse.data.items[0].link });
    } else {
      searchingMessage.edit(`"${item}" wasn't found. Please refine your search.`);
    }
  }

  async help(message: Message): Promise<void> {
    let helpString = "```";
    for (let command of this._commands.entries()) {
      helpString += `${this._commandSymbol}${command[0].padEnd(15, " ")} ${
        command[1].description
      }\n`;
    }
    helpString += "```";
    message.author.send(helpString);
  }

  start(): void {
    this._client.login(this._discordToken);
  }

  attachMetaBotCommands() {
    this.attachCommand(
      "pizza",
      async (message, args) => await this.pizzaSearch(args[1], message),
      "Find what effects a diabolic pizza with the given letters can grant you."
    );
    this.attachCommand(
      "wiki",
      async (message, args) => await this.wikiSearch(args.slice(1).join(" "), message),
      "Search the KoL wiki for the given term."
    );
    this.attachCommand(
      "mafia",
      async (message, args) => await this.mafiawikiSearch(args.slice(1).join(" "), message),
      "Search the KoLmafia wiki for the given term."
    );
    this.attachCommand(
      "mafiawiki",
      async (message, args) => await this.mafiawikiSearch(args.slice(1).join(" "), message),
      "Alias for !mafia."
    );
    this.attachCommand(
      "help",
      async (message) => await this.help(message),
      "Display this message."
    );
  }
}
