import { Client, Message } from "discord.js";

const ITEM_MATCHER = /\[\[([^\[\]]*)\]\]/g;
const COMMAND_INVOCATION = "!";

const HEART = "<3"
const RUDE = "<:rude2:585646615390584844><:rude3:585646615403167745>"

export class DiscordClient {
    private _client: Client;
    private _commands: Map<string, (message: Message) => void> = new Map();

    constructor() {
        this._client = new Client();
        this._client.on('ready', () => {
            console.log(`Logged in as ${this._client?.user?.tag}!`);
        });
        this._client.on('message', (message) => DiscordClient.onMessage(this, message));
    }

    static onMessage(client: DiscordClient, message: Message): void {
        console.log(`${message.createdTimestamp}: ${message.author.username} said "${message.content}" in channel ${message.channel}`)
        const content = message.content.toLowerCase();
        if (content && !message.author.bot) {
            for (let match of [...content.matchAll(ITEM_MATCHER)]) {
                const item = match[1];
                console.log(`Found wiki invocation "${item}"`)
                client.findItem(item, message);
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
        return this._client
    }

    addCommand(command: string, functionToCall: (message: Message) => void): void {
        this._commands.set(command.toLowerCase(), functionToCall);
    }

    findItem(item: string, message: Message) {
        message.channel.send(`I found a wiki search invocation for "${item}", but Phillammon hasn't taught me how to search the wiki yet.`)
    }

    start(token: string) : void {
        this._client.login(token);
    }
}