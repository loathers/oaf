import { Client } from "discord.js";

export class DiscordClient {
    client: Client;

    constructor() {
        this.client = new Client();
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client?.user?.tag}!`);
        });
        this.client.on('message', msg => {
            if (msg.content.toLowerCase().includes('good bot')) {
                msg.reply('<3');
            }
        });
    }

    start(token: string) : void {
        this.client.login(token);
    }
}