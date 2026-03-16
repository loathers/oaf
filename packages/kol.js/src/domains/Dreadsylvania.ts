import { ClanDungeon } from "./ClanDungeon.js";

export type DreadBossStatus = "unknown" | "predicted" | "defeated";
export type DreadBoss = { name: string; status: DreadBossStatus };

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

type MonsterType = (typeof Monster)[keyof typeof Monster];

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

type KillsAndBanishes = {
  [key in MonsterType]: { kills: number; banishes: number };
};

const SKILL_KILL_MATCHER =
  /([A-Za-z0-9\-_ ]+)\s+\(#(\d+)\)\s+(defeated\D+(\d+)|used the machine)/i;

function parseNumber(input?: string): number {
  return parseInt(input?.replace(",", "") || "0");
}

export class Dreadsylvania extends ClanDungeon {
  private static parseKillsAndBanishes(raidLog: string): KillsAndBanishes {
    return Object.values(Monster).reduce<KillsAndBanishes>((acc, m) => {
      const monsterKillRegex = new RegExp(
        `defeated (.*?) ${m} x ([0-9]+)`,
        "gi",
      );
      const monsterBanishRegex =
        /drove some (.*?) out of the (.*?) \(1 turn\)/gi;
      const kills = [...raidLog.matchAll(monsterKillRegex)]
        .map((m) => parseInt(m[2]))
        .reduce((sum, k) => sum + k, 0);
      const banishes = raidLog.match(monsterBanishRegex)?.length ?? 0;
      return { ...acc, [m]: { kills, banishes } };
    }, {} as KillsAndBanishes);
  }

  private static parseBoss(
    zone: DreadZone,
    raidLog: string,
    monsters: KillsAndBanishes,
  ): DreadBoss {
    const pair = MONSTER_PAIRS[zone];

    // Match a boss having been defeated
    for (const monster of pair) {
      if (BOSS_REGEXES[monster].test(raidLog)) {
        return { name: BOSS_NAMES[monster], status: "defeated" };
      }
    }

    // Otherwise predict the boss based on kills and banishes
    const [m1, m2] = pair;

    if (monsters[m1].kills > monsters[m2].kills + 50) {
      monsters[m2].banishes++;
    } else if (monsters[m2].kills > monsters[m1].kills + 50) {
      monsters[m1].banishes++;
    }

    if (monsters[m1].banishes !== monsters[m2].banishes) {
      const predicted = monsters[m1].banishes > monsters[m2].banishes ? m2 : m1;
      return { name: BOSS_NAMES[predicted], status: "predicted" };
    }

    return { name: "Unknown", status: "unknown" };
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

    const monsters = Dreadsylvania.parseKillsAndBanishes(raidLog);

    const capacitor = raidLog.includes("fixed The Machine (1 turn)");
    const skills = raidLog.match(/used The Machine, assisted by/g);

    return {
      forest: {
        remaining: 1000 - parseNumber(forest?.groups?.forest),
        boss: Dreadsylvania.parseBoss("forest", raidLog, monsters),
      },
      village: {
        remaining: 1000 - parseNumber(village?.groups?.village),
        boss: Dreadsylvania.parseBoss("village", raidLog, monsters),
      },
      castle: {
        remaining: 1000 - parseNumber(castle?.groups?.castle),
        boss: Dreadsylvania.parseBoss("castle", raidLog, monsters),
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
