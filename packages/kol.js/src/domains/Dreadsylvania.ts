import { ClanDungeon } from "./ClanDungeon.js";

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

const BOSS_REGEXES: Record<MonsterType, RegExp> = {
  [Monster.Bugbear]: /defeated\s+Falls-From-Sky/,
  [Monster.Werewolf]: /defeated\s+The Great Wolf of the Air/,
  [Monster.Ghost]: /defeated\s+Mayor Ghost/,
  [Monster.Zombie]: /defeated\s+the Zombie Homeowners' Association/,
  [Monster.Vampire]: /defeated\s+Count Drunkula/,
  [Monster.Skeleton]: /defeated\s+The Unkillable Skeleton/,
};

type DreadZone = "forest" | "village" | "castle";

const MONSTER_PAIRS: Record<DreadZone, readonly [MonsterType, MonsterType]> = {
  forest: [Monster.Bugbear, Monster.Werewolf],
  village: [Monster.Ghost, Monster.Zombie],
  castle: [Monster.Vampire, Monster.Skeleton],
};

// --- Structured raid log events ---

export type RaidLogEvent =
  | { type: "kill"; playerName: string; playerId: number; monster: MonsterType; count: number }
  | { type: "banish"; playerName: string; playerId: number; monster: MonsterType }
  | { type: "boss_defeated"; playerName: string; playerId: number; boss: MonsterType }
  | { type: "learned_skill"; playerName: string; playerId: number; helpers: [string, string] }
  | { type: "capacitor"; playerName: string; playerId: number }
  | { type: "noncombat"; action: string };

/** A kill or banish event for one of the two monster types in a zone, for boss prediction. */
export type ZoneEvent =
  | { type: "kill"; monster: 0 | 1; count: number }
  | { type: "banish"; monster: 0 | 1 };

const NONCOMBAT_ACTIONS = [
  // Forest
  "unlocked the attic of the cabin",
  "unlocked the fire watchtower",
  "got a Dreadsylvanian auditor's badge",
  "made the forest less spooky",
  "knocked some fruit loose",
  "wasted some fruit",
  "acquired a chunk of moon-amber",
  // Village
  "unlocked the schoolhouse",
  "unlocked the master suite",
  "hung a clanmate",
  "was hung by a clanmate",
  // Castle
  "unlocked the lab",
  "got some roast beast",
  "got a wax banana",
  "got some stinking agaric",
] as const;

const ALL_MONSTER_TYPES = Object.values(Monster);

const PLAYER_PREFIX = `([A-Za-z0-9\\-_ ]+)\\s+\\(#(\\d+)\\)\\s+`;
const MONSTER_TYPES_PATTERN = ALL_MONSTER_TYPES.join("|");
const MONSTER_PLURALS_PATTERN = ALL_MONSTER_TYPES.map(pluralise).join("|");

const KILL_MULTI = new RegExp(
  `^${PLAYER_PREFIX}defeated\\s+\\S+\\s+(${MONSTER_TYPES_PATTERN})\\s+x\\s+(\\d+)`, "i",
);
const KILL_SINGLE = new RegExp(
  `^${PLAYER_PREFIX}defeated\\s+\\S+\\s+(${MONSTER_TYPES_PATTERN})\\s+\\(1 turn\\)`, "i",
);
const BANISH = new RegExp(
  `^${PLAYER_PREFIX}drove some (${MONSTER_PLURALS_PATTERN}) out of the`, "i",
);
const LEARNED_SKILL = new RegExp(
  `^${PLAYER_PREFIX}used The Machine, assisted by (.+) and (.+)`, "i",
);
const CAPACITOR = new RegExp(
  `^${PLAYER_PREFIX}fixed The Machine \\(1 turn\\)`, "i",
);
const BOSS_LINE_REGEXES = Object.entries(BOSS_REGEXES).map(
  ([monster, regex]) => ({
    monster: monster as MonsterType,
    pattern: new RegExp(`^${PLAYER_PREFIX}${regex.source}`, "i"),
  }),
);

function parseNumber(input?: string): number {
  return parseInt(input?.replaceAll(",", "") || "0");
}

function matchKill(line: string): RaidLogEvent | null {
  const multi = line.match(KILL_MULTI);
  if (multi) {
    return {
      type: "kill",
      playerName: multi[1].trim(),
      playerId: parseInt(multi[2]),
      monster: multi[3].toLowerCase() as MonsterType,
      count: parseInt(multi[4]),
    };
  }

  const single = line.match(KILL_SINGLE);
  if (single) {
    return {
      type: "kill",
      playerName: single[1].trim(),
      playerId: parseInt(single[2]),
      monster: single[3].toLowerCase() as MonsterType,
      count: 1,
    };
  }

  return null;
}

function matchBossDefeat(line: string): RaidLogEvent | null {
  for (const { monster, pattern } of BOSS_LINE_REGEXES) {
    const match = line.match(pattern);
    if (match) {
      return {
        type: "boss_defeated",
        playerName: match[1].trim(),
        playerId: parseInt(match[2]),
        boss: monster,
      };
    }
  }
  return null;
}

function matchBanish(line: string): RaidLogEvent | null {
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

function matchLearnedSkill(line: string): RaidLogEvent | null {
  const match = line.match(LEARNED_SKILL);
  if (!match) return null;
  return {
    type: "learned_skill",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
    helpers: [match[3].trim(), match[4].trim()],
  };
}

function matchCapacitor(line: string): RaidLogEvent | null {
  const match = line.match(CAPACITOR);
  if (!match) return null;
  return {
    type: "capacitor",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
  };
}

function matchNoncombat(line: string): RaidLogEvent | null {
  const action = NONCOMBAT_ACTIONS.find((a) => line.includes(a));
  return action ? { type: "noncombat", action } : null;
}

export class Dreadsylvania extends ClanDungeon {
  /**
   * Parse raw raid log HTML into a structured list of events in document
   * order. This is the single source of truth — all other parsers derive
   * from this.
   */
  static parseEvents(raidLog: string): RaidLogEvent[] {
    const events: RaidLogEvent[] = [];

    for (const line of raidLog.split(/<br\s*\/?>|\n/)) {
      const trimmed = line.replace(/<[^>]*>/g, "").trim();
      if (!trimmed) continue;

      // Boss defeats must be checked before kills — "defeated Mayor Ghost"
      // would otherwise match the single-kill pattern for "ghost".
      const event =
        matchBossDefeat(trimmed) ??
        matchKill(trimmed) ??
        matchBanish(trimmed) ??
        matchLearnedSkill(trimmed) ??
        matchCapacitor(trimmed) ??
        matchNoncombat(trimmed);

      if (event) events.push(event);
    }

    return events;
  }

  /**
   * Extract zone-specific kill/banish events for boss prediction from
   * the raw raid log HTML. Events are in log order so the prediction
   * model can compute per-segment likelihoods.
   */
  static parseZoneEvents(zone: DreadZone, raidLog: string): ZoneEvent[] {
    const [m1, m2] = MONSTER_PAIRS[zone];
    const pattern = new RegExp(
      `defeated\\s+\\S+\\s+(${m1}|${m2})\\s+x\\s+(\\d+)` +
      `|drove some (${pluralise(m1)}|${pluralise(m2)}) out of the`,
      "gi",
    );

    const events: ZoneEvent[] = [];
    for (const match of raidLog.matchAll(pattern)) {
      if (match[1]) {
        const monster = match[1].toLowerCase() === m1 ? 0 : 1;
        events.push({ type: "kill", monster, count: parseInt(match[2]) });
      } else if (match[3]) {
        const monster = match[3].toLowerCase() === pluralise(m1) ? 0 : 1;
        events.push({ type: "banish", monster });
      }
    }
    return events;
  }

  /**
   * Predict which boss will appear based on ordered kill/banish events.
   *
   * The wiki model: each zone starts with an unknown 3:2 split between
   * two monster types (m1 and m2). Each explicit banish reduces a type's
   * weight by 1. The type with the higher final weight produces the boss.
   *
   * We use Bayesian reasoning with two hypotheses:
   *   H1: m1 starts at weight 3, m2 starts at weight 2
   *   H2: m1 starts at weight 2, m2 starts at weight 3
   *
   * Kill events provide evidence: under each hypothesis the expected kill
   * ratio depends on the current weights (which shift as banishes occur).
   * We compute the log-likelihood of the observed kills under each
   * hypothesis, segment by segment between banish events, so that each
   * kill is evaluated against the ratio that was active when it happened.
   */
  static predictBoss(zone: DreadZone, events: ZoneEvent[]): { boss: MonsterType; confidence: number } {
    const [m1, m2] = MONSTER_PAIRS[zone];

    let banishesM1 = 0;
    let banishesM2 = 0;
    let logLikelihoodH1 = 0;
    let logLikelihoodH2 = 0;

    for (const event of events) {
      if (event.type === "banish") {
        if (event.monster === 0) banishesM1++;
        else banishesM2++;
      } else {
        // Weights under each hypothesis given banishes so far
        const weightM1UnderH1 = Math.max(3 - banishesM1, 0);
        const weightM2UnderH1 = Math.max(2 - banishesM2, 0);
        const weightM1UnderH2 = Math.max(2 - banishesM1, 0);
        const weightM2UnderH2 = Math.max(3 - banishesM2, 0);

        const totalH1 = weightM1UnderH1 + weightM2UnderH1 || 1;
        const totalH2 = weightM1UnderH2 + weightM2UnderH2 || 1;

        // P(kill is m1 | hypothesis)
        const pM1UnderH1 = weightM1UnderH1 / totalH1;
        const pM1UnderH2 = weightM1UnderH2 / totalH2;

        const kills = event.count;
        if (event.monster === 0) {
          logLikelihoodH1 += pM1UnderH1 > 0 ? kills * Math.log(pM1UnderH1) : -Infinity;
          logLikelihoodH2 += pM1UnderH2 > 0 ? kills * Math.log(pM1UnderH2) : -Infinity;
        } else {
          logLikelihoodH1 += 1 - pM1UnderH1 > 0 ? kills * Math.log(1 - pM1UnderH1) : -Infinity;
          logLikelihoodH2 += 1 - pM1UnderH2 > 0 ? kills * Math.log(1 - pM1UnderH2) : -Infinity;
        }
      }
    }

    // Final weights (after all banishes) determine which boss appears
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

    // Posterior via log-sum-exp (equal prior)
    const maxLog = Math.max(logLikelihoodH1, logLikelihoodH2);
    const posteriorH1 = isFinite(maxLog)
      ? Math.exp(logLikelihoodH1 - maxLog) /
        (Math.exp(logLikelihoodH1 - maxLog) + Math.exp(logLikelihoodH2 - maxLog))
      : 0.5;
    const posteriorH2 = 1 - posteriorH1;

    // P(m1 is boss) = P(H1)*P(m1 boss|H1) + P(H2)*P(m1 boss|H2)
    let pBossM1 = 0;
    let pBossM2 = 0;

    if (bossUnderH1 === m1) pBossM1 += posteriorH1;
    else if (bossUnderH1 === m2) pBossM2 += posteriorH1;
    else {
      pBossM1 += posteriorH1 * 0.5;
      pBossM2 += posteriorH1 * 0.5;
    }

    if (bossUnderH2 === m1) pBossM1 += posteriorH2;
    else if (bossUnderH2 === m2) pBossM2 += posteriorH2;
    else {
      pBossM1 += posteriorH2 * 0.5;
      pBossM2 += posteriorH2 * 0.5;
    }

    if (pBossM1 >= pBossM2) {
      return { boss: m1, confidence: pBossM1 };
    }
    return { boss: m2, confidence: pBossM2 };
  }

  // --- High-level parsers that derive from events ---

  private static parseBoss(zone: DreadZone, events: RaidLogEvent[], raidLog: string): DreadBoss {
    const pair = MONSTER_PAIRS[zone];

    for (const event of events) {
      if (event.type === "boss_defeated" && (pair as readonly string[]).includes(event.boss)) {
        return { name: BOSS_NAMES[event.boss], status: "defeated", confidence: 1 };
      }
    }

    const zoneEvents = Dreadsylvania.parseZoneEvents(zone, raidLog);
    const prediction = Dreadsylvania.predictBoss(zone, zoneEvents);

    return {
      name: BOSS_NAMES[prediction.boss],
      status: "predicted",
      confidence: prediction.confidence,
    };
  }

  static parseOverview(raidLog: string): DreadStatus {
    const events = Dreadsylvania.parseEvents(raidLog);

    const forest = raidLog.match(
      /Your clan has defeated <b>(?<forest>[\d,]+)<\/b> monster\(s\) in the Forest/,
    );
    const village = raidLog.match(
      /Your clan has defeated <b>(?<village>[\d,]+)<\/b> monster\(s\) in the Village/,
    );
    const castle = raidLog.match(
      /Your clan has defeated <b>(?<castle>[\d,]+)<\/b> monster\(s\) in the Castle/,
    );

    const skillCount = events.filter((e) => e.type === "learned_skill").length;
    const capacitor = events.some((e) => e.type === "capacitor");

    return {
      forest: {
        remaining: 1000 - parseNumber(forest?.groups?.forest),
        boss: Dreadsylvania.parseBoss("forest", events, raidLog),
      },
      village: {
        remaining: 1000 - parseNumber(village?.groups?.village),
        boss: Dreadsylvania.parseBoss("village", events, raidLog),
      },
      castle: {
        remaining: 1000 - parseNumber(castle?.groups?.castle),
        boss: Dreadsylvania.parseBoss("castle", events, raidLog),
      },
      remainingSkills: 3 - skillCount,
      capacitor,
    };
  }

  private static hasAction(events: RaidLogEvent[], action: string): boolean {
    return events.some((e) => e.type === "noncombat" && e.action === action);
  }

  private static extractDreadForest(events: RaidLogEvent[]): DreadForestStatus {
    return {
      attic: Dreadsylvania.hasAction(events, "unlocked the attic of the cabin"),
      watchtower: Dreadsylvania.hasAction(events, "unlocked the fire watchtower"),
      auditor: Dreadsylvania.hasAction(events, "got a Dreadsylvanian auditor's badge"),
      musicbox: Dreadsylvania.hasAction(events, "made the forest less spooky"),
      kiwi:
        Dreadsylvania.hasAction(events, "knocked some fruit loose") ||
        Dreadsylvania.hasAction(events, "wasted some fruit"),

      amber: Dreadsylvania.hasAction(events, "acquired a chunk of moon-amber"),
    };
  }

  private static extractDreadVillage(events: RaidLogEvent[]): DreadVillageStatus {
    return {
      schoolhouse: Dreadsylvania.hasAction(events, "unlocked the schoolhouse"),
      suite: Dreadsylvania.hasAction(events, "unlocked the master suite"),
      hanging:
        Dreadsylvania.hasAction(events, "hung a clanmate") ||
        Dreadsylvania.hasAction(events, "was hung by a clanmate"),
    };
  }

  private static extractDreadCastle(events: RaidLogEvent[]): DreadCastleStatus {
    return {
      lab: Dreadsylvania.hasAction(events, "unlocked the lab"),
      roast: Dreadsylvania.hasAction(events, "got some roast beast"),
      banana: Dreadsylvania.hasAction(events, "got a wax banana"),
      agaricus: Dreadsylvania.hasAction(events, "got some stinking agaric"),
    };
  }

  static parse(raidLog: string): DetailedDreadStatus {
    const events = Dreadsylvania.parseEvents(raidLog);
    return {
      overview: Dreadsylvania.parseOverview(raidLog),
      forest: Dreadsylvania.extractDreadForest(events),
      village: Dreadsylvania.extractDreadVillage(events),
      castle: Dreadsylvania.extractDreadCastle(events),
    };
  }

  static parseParticipation(raidLog: string): Participation {
    const events = Dreadsylvania.parseEvents(raidLog);
    const participation: Participation = {};

    for (const event of events) {
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

  async getDetailedDreadStatus(clanId: number): Promise<DetailedDreadStatus> {
    const raidLog = await this.getRaidLog(clanId);
    return Dreadsylvania.parse(raidLog);
  }

  async getDreadStatusOverview(clanId: number): Promise<DreadStatus> {
    const raidLog = await this.getRaidLog(clanId);
    return Dreadsylvania.parseOverview(raidLog);
  }
}
