import { Item } from "data-of-loathing";

import type { Client, Result } from "../Client.js";
import { gameData } from "../GameData.js";
import { resolveEntityId } from "../utils/utils.js";

export class Storage {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async get(): Promise<Map<Item, number>> {
    const raw = await this.#client.fetchJson<Record<string, string>>("api.php", {
      query: { what: "storage", for: `${this.#client.username} bot` },
    });
    const ids = Object.keys(raw).map(Number);
    const items = await gameData.findItemsByIds(ids);
    return new Map(items.map((item) => [item, Number(raw[String(item.id)])]));
  }

  async pull(item: Item | number, quantity: number): Promise<Result> {
    const itemId = resolveEntityId(item);
    const html = await this.#client.fetchText("storage.php", {
      method: "POST",
      form: { action: "pull", whichitem: itemId, howmany: quantity, ajax: 1 },
    });
    if (!html.includes("updateInv")) return { success: false, reason: "Unknown" };
    if (html.includes("moved from storage to inventory")) return { success: true };
    if (html.includes("You already pulled one of those today")) return { success: false, reason: "Daily pull limit reached" };
    if (html.includes("You haven't got any of that item in your storage")) return { success: false, reason: "Item not in storage" };
    return { success: false, reason: "Unknown" };
  }

  async pullMeat(amount: number): Promise<Result> {
    const html = await this.#client.fetchText("storage.php", {
      method: "POST",
      form: { action: "pullmeat", howmuch: amount, ajax: 1 },
    });
    if (!html.includes("updateInv")) return { success: false, reason: "Unknown" };
    if (html.includes("moved from storage to inventory")) return { success: true };
    if (html.includes("You haven't got any of that item in your storage")) return { success: false, reason: "Insufficient meat in storage" };
    return { success: false, reason: "Unknown" };
  }

  async pullAll(): Promise<Result> {
    const html = await this.#client.fetchText("storage.php", {
      form: { action: "pullall", ajax: 1 },
      signal: AbortSignal.timeout(45000),
    });
    if (!html.includes("updateInv")) return { success: false, reason: "Unknown" };
    if (html.includes("moved from storage to inventory")) return { success: true };
    return { success: false, reason: "Unknown" };
  }
}
