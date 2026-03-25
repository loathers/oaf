import { ClanDungeon, PLAYER_PREFIX, parseLine, type RaidLogEvent } from "./ClanDungeon.js";

export type { RaidLogEvent };

export type DreadBoss = {
  name: string;
  status: "predicted" | "defeated";
  confidence: number;
};

export type DreadStatus = {
  forest: { remaining: number; boss: DreadBoss };
  village: { remaining: number; boss: DreadBoss };
  castle: { remaining: number; boss: DreadBoss };
  remainingSkills: number;
  capacitor: boolean;
};

export type DreadForestStatus = {
  attic: boolean;
  watchtower: boolean;
  auditor: boolean;
  musicbox: boolean;
  kiwi: boolean;
  amber: boolean;
};

export type DreadVillageStatus = {
  schoolhouse: boolean;
  suite: boolean;
  hanging: boolean;
};

export type DreadCastleStatus = {
  lab: boolean;
  roast: boolean;
  banana: boolean;
  agaricus: boolean;
};

export type DetailedDreadStatus = {
  overview: DreadStatus;
  forest: DreadForestStatus;
  village: DreadVillageStatus;
  castle: DreadCastleStatus;
};

export type Participation = Record<
  string | number,
  {
    skills: number;
    kills: number;
    playerId: number;
  }
>;

const Monster = {
  Bugbear: "bugbear",
  Werewolf: "werewolf",
  Ghost: "ghost",
  Zombie: "zombie",
  Vampire: "vampire",
  Skeleton: "skeleton",
} as const;

export type MonsterType = (typeof Monster)[keyof typeof Monster];

function pluralise(monster: MonsterType): string {
  if (monster === "werewolf") return "werewolves";
  return monster + "s";
}

const BOSS_NAMES: Record<MonsterType, string> = {
  bugbear: "Falls-From-Sky",
  werewolf: "The Great Wolf of the Air",
  ghost: "Mayor Ghost",
  zombie: "The Zombie Homeowners' Association",
  vampire: "Count Drunkula",
  skeleton: "The Unkillable Skeleton",
};

type DreadZone = "forest" | "village" | "castle";

const MONSTER_PAIRS: Record<DreadZone, readonly [MonsterType, MonsterType]> = {
  forest: [Monster.Bugbear, Monster.Werewolf],
  village: [Monster.Ghost, Monster.Zombie],
  castle: [Monster.Vampire, Monster.Skeleton],
};

// --- Structured raid log events ---

export type DreadEvent =
  | RaidLogEvent
  | { type: "banish"; playerName: string; playerId: number; monster: MonsterType }
  | { type: "learned_skill"; playerName: string; playerId: number; helpers: [string, string] }
  | { type: "capacitor"; playerName: string; playerId: number }
  | { type: "noncombat"; action: string };

const NONCOMBAT_ACTIONS = [
  // Forest
  "unlocked the attic of the cabin",
  "unlocked the fire watchtower",
  "got a Dreadsylvanian auditor's badge",
  "made the forest less spooky",
  "knocked some fruit loose",
  "wasted some fruit",
  "acquired a chunk of moon-amber",
  "recycled some newspapers",
  "found and sold a rare baseball card",
  "got a cool seed pod",
  "made an impression of a complicated lock",
  "rifled through a footlocker",
  "made some bone flour",
  "acquired some dread tarragon",
  "got a blood kiwi",
  // Village
  "unlocked the schoolhouse",
  "unlocked the master suite",
  "hung a clanmate",
  "was hung by a clanmate",
  "collected a ghost pencil",
  "looted the blacksmith's till",
  "robbed some graves",
  "made a shepherd's pie",
  "polished some moon-amber",
  "looted the tinker's shack",
  "made a complicated key",
  "made a ghost shawl",
  "got a bottle of eau de mort",
  "swam in a sewer",
  // Castle
  "unlocked the lab",
  "got some roast beast",
  "got a wax banana",
  "got some stinking agaric",
  "unlocked the ballroom",
  "twirled on the dance floor",
  "sifted through some ashes",
  "raided a dresser",
  "made a blood kiwitini",
  "made a cool iron ingot",
  "made a cool iron breastplate",
  // Miscellaneous
  "got the carriageman",
] as const;

const ALL_MONSTER_TYPES = Object.values(Monster);
const MONSTER_PLURALS_PATTERN = ALL_MONSTER_TYPES.map(pluralise).join("|");
const BOSS_NAMES_LIST = Object.values(BOSS_NAMES);

const BANISH = new RegExp(
  `^${PLAYER_PREFIX}drove some (${MONSTER_PLURALS_PATTERN}) out of the`, "i",
);
const LEARNED_SKILL = new RegExp(
  `^${PLAYER_PREFIX}used The Machine, assisted by (.+) and (.+)`, "i",
);
const CAPACITOR = new RegExp(
  `^${PLAYER_PREFIX}fixed The Machine \\(1 turn\\)`, "i",
);

function parseNumber(input?: string): number {
  return parseInt(input?.replaceAll(",", "") || "0");
}

function matchBanish(line: string): DreadEvent | null {
  const match = line.match(BANISH);
  if (!match) return null;
  const monster = ALL_MONSTER_TYPES.find(
    (t) => pluralise(t) === match[3].toLowerCase(),
  )!;
  return {
    type: "banish",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
    monster,
  };
}

function matchLearnedSkill(line: string): DreadEvent | null {
  const match = line.match(LEARNED_SKILL);
  if (!match) return null;
  return {
    type: "learned_skill",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
    helpers: [match[3].trim(), match[4].trim()],
  };
}

function matchCapacitor(line: string): DreadEvent | null {
  const match = line.match(CAPACITOR);
  if (!match) return null;
  return {
    type: "capacitor",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
  };
}

function matchNoncombat(line: string): DreadEvent | null {
  const action = NONCOMBAT_ACTIONS.find((a) => line.includes(a));
  return action ? { type: "noncombat", action } : null;
}

function parseEvents(raidLog: string): DreadEvent[] {
  // Current raid pages combine all dungeons in separate divs.
  // Historical raid pages are single-dungeon and have a title like
  // "Dreadsylvania run, March 11, 2026".
  const dreadBlock = raidLog.match(
    /<div id='Dreadsylvania'>([\s\S]*?)<\/div>/,
  );
  if (!dreadBlock && !raidLog.includes("Dreadsylvania run,")) return [];
  const html = dreadBlock?.[1] ?? raidLog;

  const events: DreadEvent[] = [];

  for (const line of html.split(/<br\s*\/?>|\n/)) {
    const trimmed = line.replace(/<[^>]*>/g, "").trim();
    if (!trimmed) continue;

    const event =
      matchBanish(trimmed) ??
      matchLearnedSkill(trimmed) ??
      matchCapacitor(trimmed) ??
      parseLine(trimmed, BOSS_NAMES_LIST) ??
      matchNoncombat(trimmed);

    if (event) events.push(event);
  }

  return events;
}

/**
 * Represents a single Dreadsylvania raid instance with pre-parsed events.
 * Construct via ClanDungeon service methods, or directly from HTML for testing.
 */
export class DreadsylvaniaRaid {
  readonly events: DreadEvent[];
  #raidLog: string;

  constructor(raidLog: string) {
    this.#raidLog = raidLog;
    this.events = parseEvents(raidLog);
  }

  private hasAction(action: string): boolean {
    return this.events.some((e) => e.type === "noncombat" && e.action === action);
  }

  // --- Boss prediction ---

  /**
   * Predict which boss will appear in a zone based on ordered events.
   *
   * The wiki model: each zone starts with an unknown 3:2 split between
   * two monster types. Each explicit banish reduces a type's weight by 1.
   * The type with the higher final weight produces the boss.
   *
   * We use Bayesian reasoning with two hypotheses for the initial split,
   * computing log-likelihoods segment by segment between banish events
   * so kills are evaluated against the ratio active when they happened.
   */
  predictBoss(zone: DreadZone): { boss: MonsterType; confidence: number } {
    const [m1, m2] = MONSTER_PAIRS[zone];

    let banishesM1 = 0;
    let banishesM2 = 0;
    let logLikelihoodH1 = 0;
    let logLikelihoodH2 = 0;

    for (const event of this.events) {
      switch (event.type) {
        case "defeat": {
          if (!event.boss) break;
          const monster = [m1, m2].find((m) =>
            event.monster.toLowerCase().includes(BOSS_NAMES[m].toLowerCase()),
          );
          if (monster) return { boss: monster, confidence: 1 };
          break;
        }
        case "banish": {
          if (event.monster === m1) banishesM1++;
          else if (event.monster === m2) banishesM2++;
          break;
        }
        case "kill": {
          if (event.boss) break;
          const monsterLower = event.monster.toLowerCase();
          const isM1 = monsterLower.includes(m1);
          const isM2 = monsterLower.includes(m2);
          if (!isM1 && !isM2) break;

          const weightM1UnderH1 = Math.max(3 - banishesM1, 0);
          const weightM2UnderH1 = Math.max(2 - banishesM2, 0);
          const weightM1UnderH2 = Math.max(2 - banishesM1, 0);
          const weightM2UnderH2 = Math.max(3 - banishesM2, 0);

          const totalH1 = weightM1UnderH1 + weightM2UnderH1 || 1;
          const totalH2 = weightM1UnderH2 + weightM2UnderH2 || 1;

          const pM1UnderH1 = weightM1UnderH1 / totalH1;
          const pM1UnderH2 = weightM1UnderH2 / totalH2;

          const kills = event.count;
          if (isM1) {
            logLikelihoodH1 += pM1UnderH1 > 0 ? kills * Math.log(pM1UnderH1) : -Infinity;
            logLikelihoodH2 += pM1UnderH2 > 0 ? kills * Math.log(pM1UnderH2) : -Infinity;
          } else {
            logLikelihoodH1 += 1 - pM1UnderH1 > 0 ? kills * Math.log(1 - pM1UnderH1) : -Infinity;
            logLikelihoodH2 += 1 - pM1UnderH2 > 0 ? kills * Math.log(1 - pM1UnderH2) : -Infinity;
          }
          break;
        }
      }
    }

    const finalWeightM1UnderH1 = Math.max(3 - banishesM1, 0);
    const finalWeightM2UnderH1 = Math.max(2 - banishesM2, 0);
    const finalWeightM1UnderH2 = Math.max(2 - banishesM1, 0);
    const finalWeightM2UnderH2 = Math.max(3 - banishesM2, 0);

    const bossUnderH1 = finalWeightM1UnderH1 > finalWeightM2UnderH1 ? m1
      : finalWeightM2UnderH1 > finalWeightM1UnderH1 ? m2
      : null;
    const bossUnderH2 = finalWeightM1UnderH2 > finalWeightM2UnderH2 ? m1
      : finalWeightM2UnderH2 > finalWeightM1UnderH2 ? m2
      : null;

    const maxLog = Math.max(logLikelihoodH1, logLikelihoodH2);
    const posteriorH1 = isFinite(maxLog)
      ? Math.exp(logLikelihoodH1 - maxLog) /
        (Math.exp(logLikelihoodH1 - maxLog) + Math.exp(logLikelihoodH2 - maxLog))
      : 0.5;
    const posteriorH2 = 1 - posteriorH1;

    let pBossM1 = 0;
    let pBossM2 = 0;

    if (bossUnderH1 === m1) pBossM1 += posteriorH1;
    else if (bossUnderH1 === m2) pBossM2 += posteriorH1;
    else { pBossM1 += posteriorH1 * 0.5; pBossM2 += posteriorH1 * 0.5; }

    if (bossUnderH2 === m1) pBossM1 += posteriorH2;
    else if (bossUnderH2 === m2) pBossM2 += posteriorH2;
    else { pBossM1 += posteriorH2 * 0.5; pBossM2 += posteriorH2 * 0.5; }

    if (pBossM1 >= pBossM2) {
      return { boss: m1, confidence: pBossM1 };
    }
    return { boss: m2, confidence: pBossM2 };
  }

  getBossStatus(zone: DreadZone): DreadBoss {
    const pair = MONSTER_PAIRS[zone];

    for (const event of this.events) {
      if (event.type !== "kill" || !event.boss) continue;
      const monster = pair.find((m) =>
        event.monster.toLowerCase().includes(BOSS_NAMES[m].toLowerCase()),
      );
      if (monster) {
        return { name: BOSS_NAMES[monster], status: "defeated", confidence: 1 };
      }
    }

    const prediction = this.predictBoss(zone);

    return {
      name: BOSS_NAMES[prediction.boss],
      status: "predicted",
      confidence: prediction.confidence,
    };
  }

  // --- Overview ---

  getOverview(): DreadStatus {
    const forest = this.#raidLog.match(
      /Your clan has defeated <b>(?<forest>[\d,]+)<\/b> monster\(s\) in the Forest/,
    );
    const village = this.#raidLog.match(
      /Your clan has defeated <b>(?<village>[\d,]+)<\/b> monster\(s\) in the Village/,
    );
    const castle = this.#raidLog.match(
      /Your clan has defeated <b>(?<castle>[\d,]+)<\/b> monster\(s\) in the Castle/,
    );

    const skillCount = this.events.filter((e) => e.type === "learned_skill").length;
    const capacitor = this.events.some((e) => e.type === "capacitor");

    return {
      forest: {
        remaining: 1000 - parseNumber(forest?.groups?.forest),
        boss: this.getBossStatus("forest"),
      },
      village: {
        remaining: 1000 - parseNumber(village?.groups?.village),
        boss: this.getBossStatus("village"),
      },
      castle: {
        remaining: 1000 - parseNumber(castle?.groups?.castle),
        boss: this.getBossStatus("castle"),
      },
      remainingSkills: 3 - skillCount,
      capacitor,
    };
  }

  // --- Zone details ---

  getForestStatus(): DreadForestStatus {
    return {
      attic: this.hasAction("unlocked the attic of the cabin"),
      watchtower: this.hasAction("unlocked the fire watchtower"),
      auditor: this.hasAction("got a Dreadsylvanian auditor's badge"),
      musicbox: this.hasAction("made the forest less spooky"),
      kiwi:
        this.hasAction("knocked some fruit loose") ||
        this.hasAction("wasted some fruit"),
      amber: this.hasAction("acquired a chunk of moon-amber"),
    };
  }

  getVillageStatus(): DreadVillageStatus {
    return {
      schoolhouse: this.hasAction("unlocked the schoolhouse"),
      suite: this.hasAction("unlocked the master suite"),
      hanging:
        this.hasAction("hung a clanmate") ||
        this.hasAction("was hung by a clanmate"),
    };
  }

  getCastleStatus(): DreadCastleStatus {
    return {
      lab: this.hasAction("unlocked the lab"),
      roast: this.hasAction("got some roast beast"),
      banana: this.hasAction("got a wax banana"),
      agaricus: this.hasAction("got some stinking agaric"),
    };
  }

  getDetailedStatus(): DetailedDreadStatus {
    return {
      overview: this.getOverview(),
      forest: this.getForestStatus(),
      village: this.getVillageStatus(),
      castle: this.getCastleStatus(),
    };
  }

  // --- Participation ---

  getParticipation(): Participation {
    const participation: Participation = {};

    for (const event of this.events) {
      if (event.type !== "kill" && event.type !== "learned_skill") continue;
      const { playerId } = event;
      const existing = participation[playerId] ?? { playerId, skills: 0, kills: 0 };

      if (event.type === "kill") {
        existing.kills += event.count;
      } else {
        existing.skills += 1;
      }

      participation[playerId] = existing;
    }

    return participation;
  }

  static mergeParticipation(...sources: Participation[]): Participation {
    const result: Participation = {};
    for (const source of sources) {
      for (const [id, { playerId, skills, kills }] of Object.entries(source)) {
        const existing = result[id] ?? { playerId, skills: 0, kills: 0 };
        existing.skills += skills;
        existing.kills += kills;
        result[id] = existing;
      }
    }
    return result;
  }
}

// --- ClanDungeon convenience methods ---

export class DreadsylvaniaDungeon extends ClanDungeon {
  async getRaid(clanId: number): Promise<DreadsylvaniaRaid>;
  async getRaid(clanId: number, raidId: number): Promise<DreadsylvaniaRaid>;
  async getRaid(clanId: number, raidId?: number): Promise<DreadsylvaniaRaid> {
    const log = raidId !== undefined
      ? await this.getRaidById(clanId, raidId)
      : await this.getCurrentRaid(clanId);
    return new DreadsylvaniaRaid(log);
  }
}
