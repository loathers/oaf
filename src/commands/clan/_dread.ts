import { kolClient } from "../../clients/kol";

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

  type MonsterData = {
    kills: number;
    banishes: number;
    regex: RegExp;
  };

  const monsters: Map<string, MonsterData> = new Map([
    ["bugbear", { kills: 0, banishes: 0, regex: /defeated\s+Falls\-From\-Sky/ }],
    ["werewolf", { kills: 0, banishes: 0, regex: /defeated\s+The Great Wolf of the Air/ }],
    ["ghost", { kills: 0, banishes: 0, regex: /defeated\s+Mayor Ghost/ }],
    ["zombie", { kills: 0, banishes: 0, regex: /defeated\s+the Zombie Homeowners\' Association/ }],
    ["vampire", { kills: 0, banishes: 0, regex: /defeated\s+Count Drunkula/ }],
    ["skeleton", { kills: 0, banishes: 0, regex: /defeated\s+The Unkillable Skeleton/ }],
  ]);

  const pairs = [
    ["bugbear", "werewolf"],
    ["ghost", "zombie"],
    ["vampire", "skeleton"],
  ];

  for (const monster of monsters.keys()) {
    const monsterKillRegex = new RegExp(`defeated (.*?) ${monster} x ([0-9]+)`, "gi");
    const monsterBanishRegex = /drove some (.*?) out of the (.*?) \(1 turn\)/gi;
    let match;
    while ((match = monsterKillRegex.exec(raidLog)) !== null) {
      (monsters.get(monster) as MonsterData).kills += parseInt(match[2]);
    }
    while ((match = monsterBanishRegex.exec(raidLog)) !== null) {
      (monsters.get(monster) as MonsterData).banishes++;
    }
  }
  const bosses: string[] = [];
  for (let [monster1, monster2] of pairs) {
    const monster1data = monsters.get(monster1) as MonsterData;
    const monster2data = monsters.get(monster2) as MonsterData;
    if (monster1data.kills > monster2data.kills + 50) {
      monster2data.banishes++;
    } else if (monster2data.kills > monster1data.kills + 50) {
      monster1data.banishes++;
    }
    //ELSE IF CHAIN BREAKS HERE
    if (monster1data.regex.test(raidLog)) {
      bosses.push(`x${monster1}`);
    } else if (monster2data.regex.test(raidLog)) {
      bosses.push(`x${monster2}`);
    } else if (monster1data.banishes > monster2data.banishes) {
      bosses.push(monster2);
    } else if (monster2data.banishes > monster1data.banishes) {
      bosses.push(monster1);
    } else {
      bosses.push("unknown");
    }
  }
  const capacitor = raidLog.match(/fixed The Machine \(1 turn\)/);
  const skills = raidLog.match(/used The Machine, assisted by/g);
  return {
    forest: 1000 - (forest ? parseInt(forest.groups?.forest.replace(",", "") || "0") : 0),
    village: 1000 - (village ? parseInt(village.groups?.village.replace(",", "") || "0") : 0),
    castle: 1000 - (castle ? parseInt(castle.groups?.castle.replace(",", "") || "0") : 0),
    skills: skills ? 3 - skills.length : 3,
    bosses: bosses,
    capacitor: !!capacitor,
  };
}

function extractDreadForest(raidLog: string): DreadForestStatus {
  return {
    attic: !!raidLog.match(/unlocked the attic of the cabin/),
    watchtower: !!raidLog.match(/unlocked the fire watchtower/),
    auditor: !!raidLog.match(/got a Dreadsylvanian auditor's badge/),
    musicbox: !!raidLog.match(/made the forest less spooky/),
    kiwi: !!(raidLog.match(/knocked some fruit loose/) || raidLog.match(/wasted some fruit/)),
    amber: !!raidLog.match(/acquired a chunk of moon-amber/),
  };
}

function extractDreadVillage(raidLog: string): DreadVillageStatus {
  return {
    schoolhouse: !!raidLog.match(/unlocked the schoolhouse/),
    suite: !!raidLog.match(/unlocked the master suite/),
    hanging: !!(raidLog.match(/hanged/) || raidLog.match(/hung/)),
  };
}

function extractDreadCastle(raidLog: string): DreadCastleStatus {
  return {
    lab: !!raidLog.match(/unlocked the lab/),
    roast: !!raidLog.match(/got some roast beast/),
    banana: !!raidLog.match(/got a wax banana/),
    agaricus: !!raidLog.match(/got some stinking agaric/),
  };
}

export async function getDreadStatusOverview(clanId: number): Promise<DreadStatus> {
  const raidLog = await getRaidLog(clanId);
  if (!raidLog) throw "No raidlog";
  return extractDreadOverview(raidLog);
}

export async function getDetailedDreadStatus(clanId: number): Promise<DetailedDreadStatus> {
  const raidLog = await getRaidLog(clanId);
  if (!raidLog) throw "No raidlog";
  return {
    overview: extractDreadOverview(raidLog),
    forest: extractDreadForest(raidLog),
    village: extractDreadVillage(raidLog),
    castle: extractDreadCastle(raidLog),
  };
}

export async function getMissingRaidLogs(clanId: number, parsedRaids: string[]): Promise<string[]> {
  return await kolClient.clanActionMutex.runExclusive(async () => {
    await kolClient.joinClan(clanId);
    let raidLogs = await kolClient.tryRequestWithLogin("clan_oldraidlogs.php", {});
    let raidIds: string[] = [];
    let row = 0;
    let done = false;
    while (!raidLogs.match(/No previous Clan Dungeon records found/) && !done) {
      const matches =
        raidLogs.match(
          /kisses<\/td><td class=tiny>\[<a href="clan_viewraidlog\.php\?viewlog=(?<id>\d+)/g
        ) || [];
      for (let id of matches) {
        const cleanId = id.replace(/\D/g, "");
        if (parsedRaids.includes(cleanId)) {
          done = true;
          break;
        } else {
          raidIds.push(cleanId);
        }
      }
      if (!done) {
        row += 10;
        raidLogs = await kolClient.tryRequestWithLogin("clan_oldraidlogs.php", {
          startrow: row,
        });
      }
    }
    return raidIds;
  });
}

export async function getFinishedRaidLog(raidId: string) {
  return await kolClient.tryRequestWithLogin("clan_viewraidlog.php", {
    viewlog: raidId,
    backstart: 0,
  });
}

export async function getRaidLog(clanId: number): Promise<string> {
  return await kolClient.clanActionMutex.runExclusive(async () => {
    await kolClient.joinClan(clanId);
    return await kolClient.tryRequestWithLogin("clan_raidlogs.php", {});
  });
}
