import { Client, Message, Util } from "discord.js";
import { WikiSearcher } from "./wikisearch";

const ITEM_MATCHER = /\[\[([^\[\]]*)\]\]/g;

export class DiscordClient {
  private _client: Client;
  private _wikiSearcher: WikiSearcher;
  private _discordToken: string;
  private _commands: Map<string, (message: Message, args: string[]) => void> = new Map();
  private _commandSymbol: string;

  constructor(wikiSearcher: WikiSearcher) {
    this._client = new Client();
    this._wikiSearcher = wikiSearcher;
    this._discordToken = process.env.DISCORD_TOKEN || "";
    this._commandSymbol = process.env.COMMAND_SYMBOL || "%%%NO COMMAND SYMBOL SET%%%";

    this._client.on("ready", () => {
      console.log(`Logged in as ${this._client?.user?.tag}!`);
    });
    this._client.on("message", async (message) => this.onMessage(message));
  }

  async onMessage(message: Message): Promise<void> {
    console.log(
      `${message.createdTimestamp}: ${message.author.username} said "${message.content}" in channel ${message.channel}`
    );
    const content = message.content;
    if (content && !message.author.bot) {
      const matches = [...content.matchAll(ITEM_MATCHER)];
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
      if (command) command(message, content.toLowerCase().split(" "));
      else message.channel.send("Command not recognised.");
    }
  }

  client(): Client {
    return this._client;
  }

  attachCommand(command: string, functionToCall: (message: Message, args: string[]) => void): void {
    this._commands.set(command.toLowerCase(), functionToCall);
  }

  async wikiSearch(item: string, message: Message): Promise<void> {
    const searchingMessage = await message.channel.send(
      `Searching for "${Util.cleanContent(item, message)}"...`
    );
    if (!item.length) {
      await searchingMessage.edit("Need something to search for.");
      return;
    }
    const embed = await this._wikiSearcher.getEmbed(item);
    if (embed) {
      searchingMessage.edit("", embed);
    } else {
      searchingMessage.edit(
        `"${Util.cleanContent(item, message)}" wasn't found. Please refine your search.`
      );
    }
  }

  start(): void {
    this._client.login(this._discordToken);
  }

  attachWikiSearchCommand() {
    this.attachCommand(
      "wiki",
      async (message, args) => await this.wikiSearch(args.slice(1).join(" "), message)
    );
  }
}
