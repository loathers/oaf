import { Item } from "data-of-loathing";

import type { Client } from "../Client.js";
import { gameData } from "../GameData.js";
import { cached } from "../utils/cached.js";

export class Inventory {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  get = cached(async (): Promise<Map<Item, number>> => {
    const raw = await this.#client.fetchJson<Record<string, string>>("api.php", {
      query: { what: "inventory", for: `${this.#client.username} bot` },
    });
    const ids = Object.keys(raw).map(Number);
    const items = await gameData.findItemsByIds(ids);
    return new Map(items.map((item) => [item, Number(raw[String(item.id)])]));
  });
}
