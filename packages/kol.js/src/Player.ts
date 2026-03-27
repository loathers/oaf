import type { Client } from "./Client.js";
import { generateAvatarSvg } from "./utils/avatar.js";
import { parsePlayerDate } from "./utils/utils.js";

export type ProfileData = {
  id: number;
  name: string;
  level: number;
  kolClass: string;
  avatar: string;
  ascensions: number;
  trophies: number;
  tattoos: number;
  favoriteFood: string | null;
  favoriteBooze: string | null;
  createdDate: Date;
  lastLogin: Date;
  hasDisplayCase: boolean;
};

export class Player {
  readonly id: number;
  readonly name: string;
  /** @internal */
  readonly client: Client;

  constructor(client: Client, id: number, name: string) {
    this.client = client;
    this.id = id;
    this.name = name;
  }

  async fetch(): Promise<Player.Profiled | null> {
    if (this instanceof Player.Profiled) return this;
    return this.client.players.fetch(this.id);
  }

  async isOnline(): Promise<boolean> {
    const response = await this.client.useChatMacro(`/whois ${this.name}`);
    return (
      response?.output.includes("This player is currently online") ?? false
    );
  }

  matches(identifier: string | number): boolean {
    const id = Number(identifier);
    if (!Number.isNaN(id) || typeof identifier === "number") {
      return this.id === id;
    }
    return this.name.toLowerCase() === identifier.toLowerCase();
  }

  toString(): string {
    return `${this.name} (#${this.id})`;
  }

  static parseSearch(
    html: string,
  ): { id: number; name: string; level: number; kolClass: string } | null {
    const matcher =
      /<tr><td class=small><b><a target=mainpane href="showplayer\.php\?who=(?<playerId>\d+)">(?<playerName>[^<]+)<\/a><\/b>.*?<\/td><td valign=top class=small>\d*<\/td><td valign=top class=small>(?:<img src=".*?">|(?<level>\d+))<\/td><td class=small valign=top>(?<class>[^<]*)<\/td><\/tr>/i;
    const match = matcher.exec(html)?.groups;
    if (!match) return null;

    return {
      id: Number(match.playerId),
      name: match.playerName,
      level: parseInt(match.level) || 0,
      kolClass: match.level ? match.class : "Astral Spirit",
    };
  }

  static parseWhois(html: string): string | null {
    return (
      html.match(/<a.*?><b.*?>(.*?) \(#(\d+)\)<\/b><\/a>/)?.[1] ?? null
    );
  }
}

export namespace Player {
  export class Profiled extends Player {
    readonly level: number;
    readonly kolClass: string;
    readonly avatar: string;
    readonly ascensions: number;
    readonly trophies: number;
    readonly tattoos: number;
    readonly favoriteFood: string | null;
    readonly favoriteBooze: string | null;
    readonly createdDate: Date;
    readonly lastLogin: Date;
    readonly hasDisplayCase: boolean;

    constructor(client: Client, data: ProfileData) {
      super(client, data.id, data.name);
      this.level = data.level;
      this.kolClass = data.kolClass;
      this.avatar = data.avatar;
      this.ascensions = data.ascensions;
      this.trophies = data.trophies;
      this.tattoos = data.tattoos;
      this.favoriteFood = data.favoriteFood;
      this.favoriteBooze = data.favoriteBooze;
      this.createdDate = data.createdDate;
      this.lastLogin = data.lastLogin;
      this.hasDisplayCase = data.hasDisplayCase;
    }

    override async fetch(): Promise<Player.Profiled> {
      return this;
    }

    static async parseProfile(
      html: string,
    ): Promise<Omit<ProfileData, "id" | "name" | "level" | "kolClass"> | null> {
      const header = html.match(
        /<center><table><tr><td><center>.*?<img.*?src="(.*?)".*?<b>([^>]*?)<\/b> \(#(\d+)\)<br>/,
      );
      if (!header) return null;

      return {
        avatar: (await generateAvatarSvg(html)) || header[1],
        ascensions:
          Number(
            html
              .match(/>Ascensions<\/a>:<\/b><\/td><td>(.*?)<\/td>/)?.[1]
              ?.replace(/,/g, ""),
          ) || 0,
        trophies: Number(
          html.match(/>Trophies Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
            0,
        ),
        tattoos: Number(
          html.match(/>Tattoos Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
            0,
        ),
        favoriteFood:
          html.match(/>Favorite Food:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? null,
        favoriteBooze:
          html.match(/>Favorite Booze:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ??
          null,
        createdDate: parsePlayerDate(
          html.match(/>Account Created:<\/b><\/td><td>(.*?)<\/td>/)?.[1],
        ),
        lastLogin: parsePlayerDate(
          html.match(/>Last Login:<\/b><\/td><td>(.*?)<\/td>/)?.[1],
        ),
        hasDisplayCase:
          html.match(/Display Case<\/b><\/a> in the Museum<\/td>/) !== null,
      };
    }
  }
}
