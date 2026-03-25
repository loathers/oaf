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
  werewolf: "Great Wolf of the Air",
  ghost: "Mayor Ghost",
  zombie: "Zombie Homeowners' Association",
  vampire: "Drunkula",
  skeleton: "Unkillable Skeleton",
};

const BOSS_REGEXES = {
  [Monster.Bugbear]: /defeated\s+Falls-From-Sky/,
  [Monster.Werewolf]: /defeated\s+The Great Wolf of the Air/,
  [Monster.Ghost]: /defeated\s+Mayor Ghost/,
  [Monster.Zombie]: /defeated\s+the Zombie Homeowners' Association/,
  [Monster.Vampire]: /defeated\s+Count Drunkula/,
  [Monster.Skeleton]: /defeated\s+The Unkillable Skeleton/,
} as const;

type DreadZone = "forest" | "village" | "castle";

const MONSTER_PAIRS: Record<DreadZone, readonly [MonsterType, MonsterType]> = {
  forest: [Monster.Bugbear, Monster.Werewolf],
  village: [Monster.Ghost, Monster.Zombie],
  castle: [Monster.Vampire, Monster.Skeleton],
};

/** A kill or banish event for one of the two monster types in a zone. */
export type ZoneEvent =
  | { type: "kill"; monster: 0 | 1; count: number }
  | { type: "banish"; monster: 0 | 1 };

const SKILL_KILL_MATCHER =
  /([A-Za-z0-9\-_ ]+)\s+\(#(\d+)\)\s+(defeated\D+(\d+)|used the machine)/i;

function parseNumber(input?: string): number {
  return parseInt(input?.replaceAll(",", "") || "0");
}

export class Dreadsylvania extends ClanDungeon {
  /**
   * Extract ordered kill/banish events for a zone's monster pair from
   * the raid log. Events are returned in log order so that the prediction
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
        // Kill line: match[1] is the monster type, match[2] is the count
        const monster = match[1].toLowerCase() === m1 ? 0 : 1;
        events.push({ type: "kill", monster, count: parseInt(match[2]) });
      } else if (match[3]) {
        // Banish line: match[3] is the plural monster name
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

    // Track banish counts as we walk through events
    let b1 = 0;
    let b2 = 0;
    let logLik_h1 = 0;
    let logLik_h2 = 0;

    for (const event of events) {
      if (event.type === "banish") {
        if (event.monster === 0) b1++;
        else b2++;
      } else {
        // Compute weights under each hypothesis given banishes so far
        const w1_h1 = Math.max(3 - b1, 0);
        const w2_h1 = Math.max(2 - b2, 0);
        const w1_h2 = Math.max(2 - b1, 0);
        const w2_h2 = Math.max(3 - b2, 0);

        const total_h1 = w1_h1 + w2_h1 || 1;
        const total_h2 = w1_h2 + w2_h2 || 1;

        const p1_h1 = w1_h1 / total_h1;
        const p1_h2 = w1_h2 / total_h2;

        // Accumulate log-likelihood for this kill line
        const k = event.count;
        if (event.monster === 0) {
          if (p1_h1 > 0) logLik_h1 += k * Math.log(p1_h1);
          else logLik_h1 += -Infinity;
          if (p1_h2 > 0) logLik_h2 += k * Math.log(p1_h2);
          else logLik_h2 += -Infinity;
        } else {
          if (1 - p1_h1 > 0) logLik_h1 += k * Math.log(1 - p1_h1);
          else logLik_h1 += -Infinity;
          if (1 - p1_h2 > 0) logLik_h2 += k * Math.log(1 - p1_h2);
          else logLik_h2 += -Infinity;
        }
      }
    }

    // Final weights (after all banishes) determine which boss appears
    const w1_h1 = Math.max(3 - b1, 0);
    const w2_h1 = Math.max(2 - b2, 0);
    const w1_h2 = Math.max(2 - b1, 0);
    const w2_h2 = Math.max(3 - b2, 0);

    const boss_h1 = w1_h1 > w2_h1 ? m1 : w2_h1 > w1_h1 ? m2 : null;
    const boss_h2 = w1_h2 > w2_h2 ? m1 : w2_h2 > w1_h2 ? m2 : null;

    // Posterior via log-sum-exp (equal prior)
    const maxLog = Math.max(logLik_h1, logLik_h2);
    const posterior_h1 = isFinite(maxLog)
      ? Math.exp(logLik_h1 - maxLog) /
        (Math.exp(logLik_h1 - maxLog) + Math.exp(logLik_h2 - maxLog))
      : 0.5;
    const posterior_h2 = 1 - posterior_h1;

    // P(m1 is boss) = P(H1)*P(m1 boss|H1) + P(H2)*P(m1 boss|H2)
    let pBoss_m1 = 0;
    let pBoss_m2 = 0;
    if (boss_h1 === m1) pBoss_m1 += posterior_h1;
    else if (boss_h1 === m2) pBoss_m2 += posterior_h1;
    else { pBoss_m1 += posterior_h1 * 0.5; pBoss_m2 += posterior_h1 * 0.5; }
    if (boss_h2 === m1) pBoss_m1 += posterior_h2;
    else if (boss_h2 === m2) pBoss_m2 += posterior_h2;
    else { pBoss_m1 += posterior_h2 * 0.5; pBoss_m2 += posterior_h2 * 0.5; }

    if (pBoss_m1 >= pBoss_m2) {
      return { boss: m1, confidence: pBoss_m1 };
    }
    return { boss: m2, confidence: pBoss_m2 };
  }

  private static parseBoss(zone: DreadZone, raidLog: string): DreadBoss {
    const pair = MONSTER_PAIRS[zone];

    for (const monster of pair) {
      if (BOSS_REGEXES[monster].test(raidLog)) {
        return { name: BOSS_NAMES[monster], status: "defeated", confidence: 1 };
      }
    }

    const events = Dreadsylvania.parseZoneEvents(zone, raidLog);
    const prediction = Dreadsylvania.predictBoss(zone, events);

    return {
      name: BOSS_NAMES[prediction.boss],
      status: "predicted",
      confidence: prediction.confidence,
    };
  }

  static parseOverview(raidLog: string): DreadStatus {
    const forest = raidLog.match(
      /Your clan has defeated <b>(?<forest>[\d,]+)<\/b> monster\(s\) in the Forest/,
    );
    const village = raidLog.match(
      /Your clan has defeated <b>(?<village>[\d,]+)<\/b> monster\(s\) in the Village/,
    );
    const castle = raidLog.match(
      /Your clan has defeated <b>(?<castle>[\d,]+)<\/b> monster\(s\) in the Castle/,
    );

    const capacitor = raidLog.includes("fixed The Machine (1 turn)");
    const skills = raidLog.match(/used The Machine, assisted by/g);

    return {
      forest: {
        remaining: 1000 - parseNumber(forest?.groups?.forest),
        boss: Dreadsylvania.parseBoss("forest", raidLog),
      },
      village: {
        remaining: 1000 - parseNumber(village?.groups?.village),
        boss: Dreadsylvania.parseBoss("village", raidLog),
      },
      castle: {
        remaining: 1000 - parseNumber(castle?.groups?.castle),
        boss: Dreadsylvania.parseBoss("castle", raidLog),
      },
      remainingSkills: skills ? 3 - skills.length : 3,
      capacitor,
    };
  }

  private static extractDreadForest(raidLog: string): DreadForestStatus {
    return {
      attic: raidLog.includes("unlocked the attic of the cabin"),
      watchtower: raidLog.includes("unlocked the fire watchtower"),
      auditor: raidLog.includes("got a Dreadsylvanian auditor's badge"),
      musicbox: raidLog.includes("made the forest less spooky"),
      kiwi:
        raidLog.includes("knocked some fruit loose") ||
        raidLog.includes("wasted some fruit"),
      amber: raidLog.includes("acquired a chunk of moon-amber"),
    };
  }

  private static extractDreadVillage(raidLog: string): DreadVillageStatus {
    return {
      schoolhouse: raidLog.includes("unlocked the schoolhouse"),
      suite: raidLog.includes("unlocked the master suite"),
      hanging: raidLog.includes("hanged") || raidLog.includes("hung"),
    };
  }

  private static extractDreadCastle(raidLog: string): DreadCastleStatus {
    return {
      lab: raidLog.includes("unlocked the lab"),
      roast: raidLog.includes("got some roast beast"),
      banana: raidLog.includes("got a wax banana"),
      agaricus: raidLog.includes("got some stinking agaric"),
    };
  }

  static parse(raidLog: string): DetailedDreadStatus {
    return {
      overview: Dreadsylvania.parseOverview(raidLog),
      forest: Dreadsylvania.extractDreadForest(raidLog),
      village: Dreadsylvania.extractDreadVillage(raidLog),
      castle: Dreadsylvania.extractDreadCastle(raidLog),
    };
  }

  static parseParticipation(raidLog: string): Participation[] {
    return (
      raidLog
        .match(new RegExp(SKILL_KILL_MATCHER, "gi"))
        ?.map((l) => l.match(SKILL_KILL_MATCHER))
        .filter(m => m !== null)
        .map((m) => {
          const playerId = parseInt(m[2]);
          const type = m[3].startsWith("defeated") ? "kills" : "skills";
          const num = parseInt(m[4] ?? "1");
          return {
            [playerId]: {
              playerId,
              skills: type === "skills" ? num : 0,
              kills: type === "kills" ? num : 0,
            },
          };
        }) ?? []
    );
  }

  static mergeParticipation(
    target: Participation,
    ...sources: Participation[]
  ): Participation {
    sources
      .flatMap((s) => Object.entries(s))
      .forEach(([playerId, { skills, kills }]) => {
        const existing = target[playerId] ?? { skills: 0, kills: 0 };
        target[playerId] = {
          ...existing,
          skills: existing.skills + skills,
          kills: existing.kills + kills,
          playerId: parseInt(playerId),
        };
      });

    return target;
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
