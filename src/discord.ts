import { Client, Message } from "discord.js";
import { ItemFinder } from "./itemfinder";
import { VariableManager } from "./variables";

const ITEM_MATCHER = /\[\[([^\[\]]*)\]\]/g;
const COMMAND_INVOCATION = "!";

const HEART = "<3"
const RUDE = "<:rude2:585646615390584844><:rude3:585646615403167745>"

export class DiscordClient {
    private _client: Client;
    private _itemFinder: ItemFinder;
    private _variableManager: VariableManager;
    private _commands: Map<string, (message: Message) => void> = new Map();

    constructor(variableManager: VariableManager) {
        this._client = new Client();
        this._itemFinder = new ItemFinder(variableManager);
        this._variableManager = variableManager;

        this._client.on('ready', () => {
            console.log(`Logged in as ${this._client?.user?.tag}!`);
        });
        this._client.on('message', async (message) => DiscordClient.onMessage(this, message));
    }

    static async onMessage(client: DiscordClient, message: Message): Promise<void> {
        console.log(`${message.createdTimestamp}: ${message.author.username} said "${message.content}" in channel ${message.channel}`)
        const content = message.content.toLowerCase();
        if (content && !message.author.bot) {
            for (let match of [...content.matchAll(ITEM_MATCHER)]) {
                const item = match[1];
                console.log(`Found wiki invocation "${item}"`)
                await client.findItem(item, message);
            }

            if (content.includes("good bot")) message.reply(HEART);
            if (content.includes("bad bot")) message.reply(RUDE);

            if (!content.startsWith(COMMAND_INVOCATION)) return;
            const commandString = (content.split(" ")[0].substring(COMMAND_INVOCATION.length));
            console.log(`Found command "${commandString}"`)
            const command = client._commands.get(commandString);
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
        const correctName = await this._itemFinder.findName(item);
        if (correctName) {
            message.channel.send(`https://kol.coldfront.net/thekolwiki/index.php/${correctName}`);
        } else {
            message.channel.send("Sorry, no clue what that is. Search improvements coming soon.");
        }
    }

    start() : void {
        this._client.login(this._variableManager.get("DISCORD_TOKEN"));
    }
}