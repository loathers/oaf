import { kolClient } from "../../clients/kol.js";
import { parseNumber } from "../../utils/index.js";

export class JoinClanError extends Error {
  constructor() {
    super("Could not join clan");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RaidLogMissingError extends Error {
  constructor() {
    super("Raid log missing");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type DreadStatus = {
  forest: number;
  village: number;
  castle: number;
  skills: number;
  bosses: string[];
  capacitor: boolean;
};

type DreadForestStatus = {
  attic: boolean;
  watchtower: boolean;
  auditor: boolean;
  musicbox: boolean;
  kiwi: boolean;
  amber: boolean;
};

type DreadVillageStatus = {
  schoolhouse: boolean;
  suite: boolean;
  hanging: boolean;
};

type DreadCastleStatus = {
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

const Monster = {
  Bugbear: "bugbear",
  Werewolf: "werewolf",
  Ghost: "ghost",
  Zombie: "zombie",
  Vampire: "vampire",
  Skeleton: "skeleton",
} as const;

type MonsterType = (typeof Monster)[keyof typeof Monster];

const BOSS_REGEXES = {
  [Monster.Bugbear]: /defeated\s+Falls-From-Sky/,
  [Monster.Werewolf]: /defeated\s+The Great Wolf of the Air/,
  [Monster.Ghost]: /defeated\s+Mayor Ghost/,
  [Monster.Zombie]: /defeated\s+the Zombie Homeowners' Association/,
  [Monster.Vampire]: /defeated\s+Count Drunkula/,
  [Monster.Skeleton]: /defeated\s+The Unkillable Skeleton/,
} as const;

const MONSTER_PAIRS = [
  [Monster.Bugbear, Monster.Werewolf],
  [Monster.Ghost, Monster.Zombie],
  [Monster.Vampire, Monster.Skeleton],
] as const;

type KillsAndBanishes = { [key in MonsterType]: { kills: number; banishes: number } };

function parseKillsAndBanishes(raidLog: string) {
  return Object.values(Monster).reduce((acc, m) => {
    const monsterKillRegex = new RegExp(`defeated (.*?) ${m} x ([0-9]+)`, "gi");
    const monsterBanishRegex = /drove some (.*?) out of the (.*?) \(1 turn\)/gi;
    const kills = [...raidLog.matchAll(monsterKillRegex)]
      .map((m) => parseInt(m[2]))
      .reduce((sum, k) => sum + k, 0);
    const banishes = raidLog.match(monsterBanishRegex)?.length ?? 0;
    return { ...acc, [m]: { kills, banishes } };
  }, {} as KillsAndBanishes);
}

function extractDreadOverview(raidLog: string): DreadStatus {
  const forest = raidLog.match(
    /Your clan has defeated <b>(?<forest>[\d,]+)<\/b> monster\(s\) in the Forest/
  );
  const village = raidLog.match(
    /Your clan has defeated <b>(?<village>[\d,]+)<\/b> monster\(s\) in the Village/
  );
  const castle = raidLog.match(
    /Your clan has defeated <b>(?<castle>[\d,]+)<\/b> monster\(s\) in the Castle/
  );

  const monsters = parseKillsAndBanishes(raidLog);

  const bosses: string[] = [];
  for (const [monsterName1, monsterName2] of MONSTER_PAIRS) {
    const monster1 = monsters[monsterName1];
    const monster2 = monsters[monsterName2];

    // Count banishes
    if (monster1.kills > monster2.kills + 50) {
      monster2.banishes++;
    } else if (monster2.kills > monster1.kills + 50) {
      monster1.banishes++;
    }

    // Predict bosses
    if (BOSS_REGEXES[monsterName1].test(raidLog)) {
      bosses.push(`x${monsterName1}`);
    } else if (BOSS_REGEXES[monsterName2].test(raidLog)) {
      bosses.push(`x${monsterName2}`);
    } else if (monster1.banishes > monster2.banishes) {
      bosses.push(monsterName2);
    } else if (monster2.banishes > monster1.banishes) {
      bosses.push(monsterName1);
    } else {
      bosses.push("unknown");
    }
  }

  const capacitor = raidLog.includes("fixed The Machine (1 turn)");
  const skills = raidLog.match(/used The Machine, assisted by/g);

  return {
    forest: 1000 - parseNumber(forest?.groups?.forest),
    village: 1000 - parseNumber(village?.groups?.village),
    castle: 1000 - parseNumber(castle?.groups?.castle),
    skills: skills ? 3 - skills.length : 3,
    bosses,
    capacitor,
  };
}

function extractDreadForest(raidLog: string): DreadForestStatus {
  return {
    attic: raidLog.includes("unlocked the attic of the cabin"),
    watchtower: raidLog.includes("unlocked the fire watchtower"),
    auditor: raidLog.includes("got a Dreadsylvanian auditor's badge"),
    musicbox: raidLog.includes("made the forest less spooky"),
    kiwi: raidLog.includes("knocked some fruit loose") || raidLog.includes("wasted some fruit"),
    amber: raidLog.includes("acquired a chunk of moon-amber"),
  };
}

function extractDreadVillage(raidLog: string): DreadVillageStatus {
  return {
    schoolhouse: raidLog.includes("unlocked the schoolhouse"),
    suite: raidLog.includes("unlocked the master suite"),
    hanging: raidLog.includes("hanged") || raidLog.includes("hung"),
  };
}

function extractDreadCastle(raidLog: string): DreadCastleStatus {
  return {
    lab: raidLog.includes("unlocked the lab"),
    roast: raidLog.includes("got some roast beast"),
    banana: raidLog.includes("got a wax banana"),
    agaricus: raidLog.includes("got some stinking agaric"),
  };
}

export async function getDreadStatusOverview(clanId: number): Promise<DreadStatus> {
  const raidLog = await getRaidLog(clanId);
  return extractDreadOverview(raidLog);
}

export async function getDetailedDreadStatus(clanId: number): Promise<DetailedDreadStatus> {
  const raidLog = await getRaidLog(clanId);

  return {
    overview: extractDreadOverview(raidLog),
    forest: extractDreadForest(raidLog),
    village: extractDreadVillage(raidLog),
    castle: extractDreadCastle(raidLog),
  };
}

export async function getMissingRaidLogs(clanId: number, parsedRaids: number[]): Promise<number[]> {
  return await kolClient.clanActionMutex.runExclusive(async () => {
    if (!(await kolClient.joinClan(clanId))) throw new JoinClanError();
    let raidLogs = await kolClient.visitUrl("clan_oldraidlogs.php", {});
    const raidIds: number[] = [];
    let row = 0;
    let done = false;
    while (!raidLogs.includes("No previous Clan Dungeon records found") && !done) {
      const matches =
        raidLogs.match(
          /kisses<\/td><td class=tiny>\[<a href="clan_viewraidlog\.php\?viewlog=(?<id>\d+)/g
        ) || [];
      for (const id of matches) {
        const cleanId = Number(id.replace(/\D/g, ""));
        if (parsedRaids.includes(cleanId)) {
          done = true;
          break;
        }
        raidIds.push(cleanId);
      }
      if (!done) {
        row += 10;
        raidLogs = await kolClient.visitUrl("clan_oldraidlogs.php", { startrow: row });
      }
    }
    return raidIds;
  });
}

export async function getFinishedRaidLog(raidId: number) {
  return await kolClient.visitUrl("clan_viewraidlog.php", {
    viewlog: raidId,
    backstart: 0,
  });
}

export async function getRaidLog(clanId: number): Promise<string> {
  return await kolClient.clanActionMutex.runExclusive(async () => {
    if (!(await kolClient.joinClan(clanId))) throw new JoinClanError();
    const log = await kolClient.visitUrl("clan_raidlogs.php", {});
    if (!log) throw new RaidLogMissingError();
    return log;
  });
}
