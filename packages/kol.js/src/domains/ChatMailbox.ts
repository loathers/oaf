import { Player } from "../Player.js";
import { type Message, Mailbox } from "./Mailbox.js";

type RawChatMessage = {
  who?: Player;
  type?: string;
  msg?: string;
  link?: string;
  channel?: string;
  time: string;
};

export interface ChatMessage extends Message {
  type: "public" | "private" | "system";
}

const isValidMessage = (
  msg: RawChatMessage,
): msg is RawChatMessage & {
  type: ChatMessage["type"];
  who: Player;
  msg: string;
} => msg.who !== undefined && msg.msg !== undefined;

export class ChatMailbox extends Mailbox<ChatMessage> {
  #lastFetchedMessages = "0";

  async fetch(): Promise<ChatMessage[]> {
    const response = await this.client.fetchJson<{
      last: string;
      msgs: RawChatMessage[];
    }>("newchatmessages.php", {
      query: {
        j: 1,
        lasttime: this.#lastFetchedMessages,
      },
    });

    this.#lastFetchedMessages = response["last"];

    return response["msgs"].filter(isValidMessage).map(
      (msg): ChatMessage => ({
        type: msg.type,
        who: new Player(this.client, Number(msg.who.id), msg.who.name),
        msg: msg.msg,
        time: new Date(Number(msg.time) * 1000),
      }),
    );
  }

  async check() {
    const messages = await this.fetch();
    messages.forEach((message) => {
      switch (message.type) {
        case "public":
          return void this.client.emit("public", message);
        case "private":
          return void this.client.emit("whisper", message);
        case "system":
          return void this.client.emit("system", message);
      }
    });
  }

  async macro(command: string) {
    return await this.client.fetchJson<{ output: string; msgs: string[] }>(
      "submitnewchat.php",
      {
        query: {
          graf: command,
          j: 1,
        },
      },
    );
  }

  async getUpdates() {
    const result = await this.macro("/updates");
    return [
      ...result.output.matchAll(
        /<p><b>[A-za-z]+ \d+<\/b> - (.*?)(?=<p>(?:<b>|<hr>))/g,
      ),
    ].map((m) => m[1]);
  }

  async send(recipientId: number, message: string) {
    await this.macro(`/clan /w ${recipientId} ${message}`);
  }
}
