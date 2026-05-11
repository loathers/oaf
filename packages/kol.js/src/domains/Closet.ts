import { Item } from "data-of-loathing";

import type { Client, Result } from "../Client.js";
import { gameData } from "../GameData.js";
import { resolveEntityId } from "../utils/utils.js";

export class Closet {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async get(): Promise<Map<Item, number>> {
    const raw = await this.#client.fetchJson<Record<string, string>>("api.php", {
      query: { what: "closet", for: `${this.#client.username} bot` },
    });
    const ids = Object.keys(raw).map(Number);
    const items = await gameData.findItemsByIds(ids);
    return new Map(items.map((item) => [item, Number(raw[String(item.id)])]));
  }

  async deposit(item: Item | number, quantity: number): Promise<Result> {
    const itemId = resolveEntityId(item);
    const html = await this.#client.fetchText("closet.php", {
      method: "POST",
      form: { action: "put", whichitem: itemId, howmany: quantity, ajax: 1 },
    });
    if (html.includes("updateInv")) return { success: true };
    return { success: false, reason: "Item not in inventory" };
  }

  async withdraw(item: Item | number, quantity: number): Promise<Result> {
    const itemId = resolveEntityId(item);
    const html = await this.#client.fetchText("closet.php", {
      method: "POST",
      form: { action: "take", whichitem: itemId, howmany: quantity, ajax: 1 },
    });
    if (html.includes("updateInv")) return { success: true };
    return { success: false, reason: "Item not in closet" };
  }

  async depositMeat(amount: number): Promise<Result> {
    const html = await this.#client.fetchText("closet.php", {
      method: "POST",
      form: { action: "putmeat", howmuch: amount, ajax: 1 },
    });
    if (html.includes("updateInv")) return { success: true };
    return { success: false, reason: "Unknown" };
  }

  async withdrawMeat(amount: number): Promise<Result> {
    const html = await this.#client.fetchText("closet.php", {
      method: "POST",
      form: { action: "takemeat", howmuch: amount, ajax: 1 },
    });
    if (html.includes("updateInv")) return { success: true };
    return { success: false, reason: "Unknown" };
  }
}
