import type { Client, Result } from "../Client.js";
import { DailyFlag } from "../flags/registry.js";
import { registerSkillBehavior } from "./Skills.js";

const TOME_IDS = [7213, 7214, 7215, 7216, 7217, 7218] as const;

abstract class Bookshelf {
  constructor(
    readonly skillId: number,
    readonly preaction: string,
  ) {
    registerSkillBehavior(skillId, this);
  }

  async cast(client: Client): Promise<Result> {
    const html = await client.fetchText("campground.php", {
      method: "POST",
      form: { preaction: this.preaction },
    });
    // TODO: validate against a real campground.php response fixture
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
}

export class Libram extends Bookshelf {
  /** MP cost for the nth summon today (1-indexed). */
  mpCost(n: number): number {
    return 1 + (n * (n - 1)) / 2;
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
