import { Client } from "./Client.js";
import { Player } from "./Player.js";

export class Cache<T> {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  cache: T[] = [];
}

export class PlayerCache extends Cache<Player<boolean>> {
  async fetch(identifier: string | number, full: true): Promise<Player<true>>;
  async fetch(identifier: string | number): Promise<Player<boolean>>;
  async fetch(identifier: string | number, full = false) {
    const player = await (async () => {
      const cached = this.cache.find(p => p.matchesIdentifier(identifier));
      if (cached) {
        return cached;
      }
      const fetched = await Player.from(this.client, identifier);
      if (!fetched) return null;
      this.cache.push(fetched);
      return fetched;
    })();

    if (!player) return player;

    return full ? await player.full() : player;
  }
}