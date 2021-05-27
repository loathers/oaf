import { Client, Message } from "discord.js";
import { ItemFinder } from "./itemfinder";
import { VariableManager } from "./variables";

const ITEM_MATCHER = /\[\[([^\[\]]*)\]\]/g;

const HEART = "<3"
const RUDE = "<:rude2:585646615390584844><:rude3:585646615403167745>"

export class DiscordClient {
    private _client: Client;
    private _itemFinder: ItemFinder;
    private _discordToken: string;
    private _commands: Map<string, (message: Message) => void> = new Map();
    private _commandSymbol: string;

    constructor(variableManager: VariableManager) {
        this._client = new Client();
        this._itemFinder = new ItemFinder(variableManager);
        this._discordToken = variableManager.get("DISCORD_TOKEN") || "";
        this._commandSymbol = variableManager.get("COMMAND_SYMBOL") || "%%%NO COMMAND SYMBOL SET%%%";

        this._client.on('ready', () => {
            console.log(`Logged in as ${this._client?.user?.tag}!`);
        });
        this._client.on('message', async (message) => this.onMessage(message));
    }

    async onMessage(message: Message): Promise<void> {
        console.log(`${message.createdTimestamp}: ${message.author.username} said "${message.content}" in channel ${message.channel}`)
        const content = message.content;
        if (content && !message.author.bot) {
            const matches = [...content.matchAll(ITEM_MATCHER)]
            if (matches.length > 3) {
                message.channel.send("Detected too many wiki invocations in one message. Returning first three invocations only.");
                matches.length = 3;
            }
            for (let match of matches) {
                const item = match[1];
                console.log(`Found wiki invocation "${item}"`)
                await this.findItem(item, message);
            }

            if (content.toLowerCase().includes("good bot")) message.reply(HEART);
            if (content.toLowerCase().includes("bad bot")) message.reply(RUDE);

            if (!content.startsWith(this._commandSymbol)) return;
            const commandString = (content.toLowerCase().split(" ")[0].substring(this._commandSymbol.length));
            console.log(`Found command "${commandString}"`)
            const command = this._commands.get(commandString);
            if (command) command(message);
            else message.channel.send("Command not recognised.");
        }
    }

    client(): Client {
        return this._client;
    }

    addCommand(command: string, functionToCall: (message: Message) => void): void {
        this._commands.set(command.toLowerCase(), functionToCall);
    }

    async findItem(item: string, message: Message): Promise<void> {
        if (!item.length) message.channel.send("Need something to search.");
        const embed = await this._itemFinder.itemfinderEmbed(item);
        if (embed) {
            message.channel.send(embed);
        } else {
            message.channel.send("The requested page couldn't be found. Please refine your search.");
        }
    }

    start() : void {
        this._client.login(this._discordToken);
    }
}