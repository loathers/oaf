import type { Client } from "../Client.js";
import type { Player } from "../Player.js";

export type Message = {
  type: "private" | "system" | "public" | "kmail";
  who: Player;
  msg: string;
  time: Date;
};

export abstract class Mailbox<T extends Message> {
  protected client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  abstract fetch(): Promise<T[]>;
  abstract check(): Promise<void>;
  abstract send(recipientId: number, message: string): Promise<void>;
}
