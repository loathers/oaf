import type { Client } from "../Client.js";
import { Player } from "../Player.js";

type SearchData = { level: number; kolClass: string };

export class Players {
  #client: Client;
  #byId = new Map<number, Player>();
  #nameToId = new Map<string, number>();
  #searchData = new Map<number, SearchData>();

  constructor(client: Client) {
    this.#client = client;
  }

  #getCached(identifier: string | number): Player | undefined {
    const id = Number(identifier);
    if (!Number.isNaN(id) || typeof identifier === "number") {
      return this.#byId.get(id);
    }
    const resolvedId = this.#nameToId.get(String(identifier).toLowerCase());
    return resolvedId !== undefined ? this.#byId.get(resolvedId) : undefined;
  }

  #cache(player: Player, searchData?: SearchData): void {
    this.#byId.set(player.id, player);
    this.#nameToId.set(player.name.toLowerCase(), player.id);
    if (searchData) this.#searchData.set(player.id, searchData);
  }

  async resolve(identifier: string | number): Promise<Player | null> {
    return this.#getCached(identifier) ?? this.#resolveUncached(identifier);
  }

  async fetch(identifier: string | number): Promise<Player.Profiled | null> {
    const cached = this.#getCached(identifier);
    if (cached instanceof Player.Profiled) return cached;

    const identity = cached ?? (await this.#resolveUncached(identifier));
    if (!identity) return null;

    const html = await this.#client.fetchText("showplayer.php", {
      query: { who: identity.id },
    });

    const profileData = await Player.Profiled.parseProfile(html);
    if (!profileData) return null;

    const search = this.#searchData.get(identity.id);

    const profiled = new Player.Profiled(this.#client, {
      id: identity.id,
      name: identity.name,
      level: search?.level ?? 0,
      kolClass: search?.kolClass ?? "Unknown",
      ...profileData,
    });

    this.#cache(profiled);
    return profiled;
  }

  async getNameFromId(id: number): Promise<string | null> {
    try {
      const html = await this.#client.fetchText("submitnewchat.php", {
        query: { graf: `/whois ${id}` },
      });
      return Player.parseNameFromWhois(html);
    } catch {
      return null;
    }
  }

  async #resolveUncached(identifier: string | number): Promise<Player | null> {
    const id = Number(identifier);

    if (!Number.isNaN(id) || typeof identifier === "number") {
      const name = await this.getNameFromId(id);
      if (!name) return null;
      return this.#resolveByName(name);
    }

    return this.#resolveByName(identifier as string);
  }

  async #resolveByName(name: string): Promise<Player | null> {
    try {
      const html = await this.#client.fetchText("searchplayer.php", {
        query: {
          searchstring: name.replace(/_/g, "\\_"),
          searching: "Yep.",
          for: "",
          startswith: 1,
          hardcoreonly: 0,
        },
      });

      const result = Player.parseSearch(html);
      if (!result) return null;

      const player = new Player(this.#client, result.id, result.name);
      this.#cache(player, { level: result.level, kolClass: result.kolClass });
      return player;
    } catch {
      return null;
    }
  }
}
