import createDebug from "debug";

import type { Client, Result } from "../Client.js";
import { DailyFlag } from "../flags/registry.js";
import { registerInterceptor } from "../proxy/registry.js";
import { recordSkillCast, registerSkillBehavior } from "./Skills.js";

const debug = createDebug("kol.js:skills");

const TOME_IDS = [7213, 7214, 7215, 7216, 7217, 7218] as const;

export abstract class Bookshelf {
  constructor(
    readonly skillId: number,
    readonly preaction: string,
  ) {
    registerSkillBehavior(skillId, this);
    registerInterceptor({
      matches: (req) =>
        req.path === "campground.php" &&
        req.params.get("preaction") === preaction,
      onResponse(client, _req, res) {
        if (typeof res.body !== "string") return;
        if (!res.body.includes("You acquire")) return;
        recordSkillCast(client, skillId);
      },
    });
  }

  async cast(client: Client): Promise<Result> {
    const html = await client.fetchText("campground.php", {
      method: "POST",
      form: { preaction: this.preaction },
    });
    if (html.includes("You acquire")) return { success: true };
    return { success: false, reason: "Cast failed" };
  }
}

export class Tome extends Bookshelf {
  dailyLimit = async (client: Client) => {
    if (!client.isRestricted()) return 3;
    // In ronin/hardcore all tomes share a pool of 3 casts/day.
    // Return an effective per-skill limit that, when subtracted from
    // castsToday(this), yields the correct shared remaining.
    const skillCasts = client.flags.get(DailyFlag.skillCasts);
    return 3 - Tome.totalCastsToday(client) + (skillCasts[this.skillId] ?? 0);
  };

  static totalCastsToday(client: Client): number {
    const skillCasts = client.flags.get(DailyFlag.skillCasts);
    return TOME_IDS.reduce((n, id) => n + (skillCasts[id] ?? 0), 0);
  }

  /** If the page shows the pool is exhausted, bring our total up to 3. */
  static syncFromPage(client: Client, html: string): void {
    if (!html.includes("You've already used up your Tome summons for the day")) return;
    const casts = client.flags.get(DailyFlag.skillCasts);
    const total = TOME_IDS.reduce((n, id) => n + (casts[id] ?? 0), 0);
    if (total < 3) {
      debug("synced tome pool to exhausted from page");
      client.flags.set(DailyFlag.skillCasts, {
        ...casts,
        [TOME_IDS[0]]: (casts[TOME_IDS[0]] ?? 0) + (3 - total),
      });
    }
  }
}

export class Libram extends Bookshelf {
  static #byPreaction = new Map<string, Libram>();

  constructor(skillId: number, preaction: string) {
    super(skillId, preaction);
    Libram.#byPreaction.set(preaction, this);
  }

  /** MP cost for the nth summon today (1-indexed). */
  mpCost(n: number): number {
    return 1 + (n * (n - 1)) / 2;
  }

  /** Derive castsToday from the next-cast MP cost shown on bookshelf buttons. */
  static syncFromPage(client: Client, html: string): void {
    // mpCost(n) = 1 + n*(n-1)/2  →  n = (1 + sqrt(1 + 8*(cost-1))) / 2
    for (const [, preaction, mpStr] of html.matchAll(
      /name=preaction value="([^"]+)"[^>]*>[^<]*<input[^>]+value="[^(]+\((\d+) MP\)"/g,
    )) {
      const instance = Libram.#byPreaction.get(preaction);
      if (!instance) continue;
      const mpCost = Number(mpStr);
      const n = Math.round((1 + Math.sqrt(1 + 8 * (mpCost - 1))) / 2);
      const castsToday = n - 1;
      const casts = client.flags.get(DailyFlag.skillCasts);
      if ((casts[instance.skillId] ?? 0) !== castsToday) {
        debug("synced skill %d casts to %d from page", instance.skillId, castsToday);
        client.flags.set(DailyFlag.skillCasts, { ...casts, [instance.skillId]: castsToday });
      }
    }
  }
}

export class Grimoire extends Bookshelf {
  dailyLimit = async () => 1;
}

export const snowcones = new Tome(7213, "summonsnowcone");
export const stickers = new Tome(7214, "summonstickers");
export const sugarSheets = new Tome(7215, "summonsugarsheets");
export const clipArt = new Tome(7216, "combinecliparts");
export const radLibs = new Tome(7217, "summonradlibs");
export const smithsness = new Tome(7218, "summonsmithsness");

export const candyHeart = new Libram(7219, "summoncandyheart");
export const partyFavor = new Libram(7220, "summonpartyfavor");
export const loveSong = new Libram(7221, "summonlovesongs");
export const brickos = new Libram(7222, "summonbrickos");
export const dice = new Libram(7223, "summongygax");
export const resolutions = new Libram(7224, "summonresolutions");
export const taffy = new Libram(7225, "summontaffy");

export const hilariousObjects = new Grimoire(7226, "summonhilariousitems");
export const tastefulItems = new Grimoire(7227, "summonspencersitems");
export const alicesArmyCards = new Grimoire(7228, "summonaa");
export const geekyGifts = new Grimoire(7229, "summonthinknerd");
export const confiscatedThings = new Grimoire(7230, "summonconfiscators");

registerInterceptor({
  path: "campground.php",
  onResponse(client, _req, res) {
    if (typeof res.body !== "string") return;
    if (!res.body.includes("Tomes:")) return;
    Libram.syncFromPage(client, res.body);
    Tome.syncFromPage(client, res.body);
  },
});
