import { Client } from "./Client.js";
import { generateAvatarSvg } from "./utils/avatar.js";
import { parsePlayerDate } from "./utils/utils.js";

export type If<
  Value extends boolean,
  TrueResult,
  FalseResult = null,
> = Value extends true
  ? TrueResult
  : Value extends false
    ? FalseResult
    : TrueResult | FalseResult;

export class Player<IsFull extends boolean = boolean> {
  #client: Client;

  id: number;
  name: string;

  level: If<IsFull, number>;
  kolClass: If<IsFull, string>;
  avatar: If<IsFull, string>;
  ascensions: If<IsFull, number>;
  trophies: If<IsFull, number>;
  tattoos: If<IsFull, number>;
  favoriteFood: If<IsFull, string | null>;
  favoriteBooze: If<IsFull, string | null>;
  createdDate: If<IsFull, Date>;
  lastLogin: If<IsFull, Date>;
  hasDisplayCase: If<IsFull, boolean>;

  constructor(
    client: Client,
    id: number,
    name: string,
    level: number | null = null,
    kolClass: string | null = null,
  ) {
    this.#client = client;
    this.id = id;
    this.name = name;
    this.level = level as If<IsFull, number>;
    this.kolClass = kolClass as If<IsFull, string>;
    this.avatar = null as If<IsFull, string>;
    this.ascensions = null as If<IsFull, number>;
    this.trophies = null as If<IsFull, number>;
    this.tattoos = null as If<IsFull, number>;
    this.favoriteFood = null as If<IsFull, string>;
    this.favoriteBooze = null as If<IsFull, string>;
    this.createdDate = null as If<IsFull, Date>;
    this.lastLogin = null as If<IsFull, Date>;
    this.hasDisplayCase = null as If<IsFull, boolean>;
  }

  isFull(): this is Player<true> {
    return this.createdDate !== null;
  }

  isPartial(): this is Player<false> {
    return this.createdDate === null;
  }

  static async getNameFromId(
    client: Client,
    id: number,
  ): Promise<string | null> {
    try {
      const profile = await client.fetchText("submitnewchat.php", {
        searchParams: { graf: `/whois ${id}` },
      });
      const name = profile.match(/<a.*?><b.*?>(.*?) \(#(\d+)\)<\/b><\/a>/)?.[1];
      return name ?? null;
    } catch {
      return null;
    }
  }

  static async fromName(
    client: Client,
    name: string,
  ): Promise<Player<false> | null> {
    try {
      const matcher =
        /<tr><td class=small><b><a target=mainpane href="showplayer\.php\?who=(?<playerId>\d+)">(?<playerName>[^<]+)<\/a><\/b>.*?<\/td><td valign=top class=small>\d*<\/td><td valign=top class=small>(?:<img src=".*?">|(?<level>\d+))<\/td><td class=small valign=top>(?<class>[^<]+)<\/td><\/tr>/i;
      const search = await client.fetchText("searchplayer.php", {
        searchParams: {
          searchstring: name.replace(/_/g, "\\_"),
          searching: "Yep.",
          for: "",
          startswith: 1,
          hardcoreonly: 0,
        },
      });
      const match = matcher.exec(search)?.groups;

      if (!match) {
        return null;
      }

      const clazz = match.level ? match.class : "Astral Spirit";

      return new Player(
        client,
        Number(match.playerId),
        match.playerName,
        parseInt(match.level) || 0,
        clazz,
      );
    } catch (error) {
      return null;
    }
  }

  static async fromId(
    client: Client,
    id: number,
  ): Promise<Player<false> | null> {
    const name = await Player.getNameFromId(client, id);
    if (!name) return null;
    return await Player.fromName(client, name);
  }

  static async from(
    client: Client,
    identifier: string | number,
  ): Promise<Player<false> | null> {
    const id = Number(identifier);

    if (!Number.isNaN(id) || typeof identifier === "number") {
      return await Player.fromId(client, id);
    }

    return await Player.fromName(client, identifier);
  }

  matchesIdentifier(identifier: string | number) {
    const id = Number(identifier);
    if (!Number.isNaN(id) || typeof identifier === "number") {
      return this.id === identifier;
    }

    return this.name.toLowerCase() === identifier.toLowerCase();
  }

  async full(): Promise<Player<true> | null> {
    const t = this as unknown as Player<true>;

    if (this.isFull()) return this;

    try {
      const profile = await this.#client.fetchText("showplayer.php", {
        searchParams: {
          who: this.id,
        },
      });
      const header = profile.match(
        /<center><table><tr><td><center>.*?<img.*?src="(.*?)".*?<b>([^>]*?)<\/b> \(#(\d+)\)<br>/,
      );
      if (!header) return null;

      t.avatar = (await generateAvatarSvg(profile)) || header[1];

      t.ascensions =
        Number(
          profile
            .match(/>Ascensions<\/a>:<\/b><\/td><td>(.*?)<\/td>/)?.[1]
            ?.replace(/,/g, ""),
        ) || 0;

      t.trophies = Number(
        profile.match(/>Trophies Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
          0,
      );

      t.tattoos = Number(
        profile.match(/>Tattoos Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
          0,
      );

      t.favoriteFood =
        profile.match(/>Favorite Food:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? null;
      t.favoriteBooze =
        profile.match(/>Favorite Booze:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
        null;

      t.createdDate = parsePlayerDate(
        profile.match(/>Account Created:<\/b><\/td><td>(.*?)<\/td>/)?.[1],
      );

      t.lastLogin = parsePlayerDate(
        profile.match(/>Last Login:<\/b><\/td><td>(.*?)<\/td>/)?.[1],
      );

      t.hasDisplayCase =
        profile.match(/Display Case<\/b><\/a> in the Museum<\/td>/) !== null;

      return t;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async isOnline() {
    const response = await this.#client.useChatMacro(`/whois ${this.name}`);
    return (
      response?.output.includes("This player is currently online") ?? false
    );
  }

  toString() {
    return `${this.name} (#${this.id})`;
  }
}
