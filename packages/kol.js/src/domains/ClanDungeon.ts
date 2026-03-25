import type { Client } from "../Client.js";

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

export type RaidLogEvent =
  | { type: "kill"; playerName: string; playerId: number; monster: string; count: number; boss: boolean }
  | { type: "defeat"; playerName: string; playerId: number; monster: string; count: number }
  | { type: "loot"; playerName: string; playerId: number; item: string; recipientName: string; recipientId: number };

export const PLAYER_PREFIX = `([A-Za-z0-9\\-_ ]+)\\s+\\(#(\\d+)\\)\\s+`;

const KILL_MULTI = new RegExp(
  `^${PLAYER_PREFIX}defeated\\s+(.+?)\\s+x\\s+(\\d+)`, "i",
);
const KILL_SINGLE = new RegExp(
  `^${PLAYER_PREFIX}defeated\\s+(.+?)\\s+\\(1 turn\\)`, "i",
);
const DEFEAT_MULTI = new RegExp(
  `^${PLAYER_PREFIX}was defeated by\\s+(.+?)\\s+x\\s+(\\d+)`, "i",
);
const DEFEAT_SINGLE = new RegExp(
  `^${PLAYER_PREFIX}was defeated by\\s+(.+?)\\s+\\(1 turn\\)`, "i",
);
const LOOT = new RegExp(
  `^${PLAYER_PREFIX}distributed\\s+(.+?)\\s+to\\s+(.+?)\\s+\\(#(\\d+)\\)`, "i",
);

function matchKill(line: string, bossNames: string[]): RaidLogEvent | null {
  const multi = line.match(KILL_MULTI);
  if (multi) {
    const monster = multi[3].trim();
    return {
      type: "kill",
      playerName: multi[1].trim(),
      playerId: parseInt(multi[2]),
      monster,
      count: parseInt(multi[4]),
      boss: bossNames.some((b) => monster.toLowerCase().includes(b.toLowerCase())),
    };
  }

  const single = line.match(KILL_SINGLE);
  if (single) {
    const monster = single[3].trim();
    return {
      type: "kill",
      playerName: single[1].trim(),
      playerId: parseInt(single[2]),
      monster,
      count: 1,
      boss: bossNames.some((b) => monster.toLowerCase().includes(b.toLowerCase())),
    };
  }

  return null;
}

function matchDefeat(line: string): RaidLogEvent | null {
  const multi = line.match(DEFEAT_MULTI);
  if (multi) {
    return {
      type: "defeat",
      playerName: multi[1].trim(),
      playerId: parseInt(multi[2]),
      monster: multi[3].trim(),
      count: parseInt(multi[4]),
    };
  }

  const single = line.match(DEFEAT_SINGLE);
  if (single) {
    return {
      type: "defeat",
      playerName: single[1].trim(),
      playerId: parseInt(single[2]),
      monster: single[3].trim(),
      count: 1,
    };
  }

  return null;
}

function matchLoot(line: string): RaidLogEvent | null {
  const match = line.match(LOOT);
  if (!match) return null;
  return {
    type: "loot",
    playerName: match[1].trim(),
    playerId: parseInt(match[2]),
    item: match[3].trim(),
    recipientName: match[4].trim(),
    recipientId: parseInt(match[5]),
  };
}

/**
 * Try to parse a single stripped log line into a base raid log event.
 * Returns null if the line doesn't match any known pattern.
 */
export function parseLine(line: string, bossNames: string[]): RaidLogEvent | null {
  return (
    matchKill(line, bossNames) ??
    matchDefeat(line) ??
    matchLoot(line)
  );
}

/**
 * Service class for interacting with KoL clan dungeons.
 * Handles joining clans, fetching raid logs, and creating
 * raid instances from the fetched HTML.
 */
export class ClanDungeon {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getCurrentRaid(clanId: number): Promise<string> {
    return await this.#client.actionMutex.runExclusive(async () => {
      if (!(await this.#client.joinClan(clanId))) throw new JoinClanError();
      const log = await this.#client.fetchText("clan_raidlogs.php");
      if (!log) throw new RaidLogMissingError();
      return log;
    });
  }

  async getRaidById(clanId: number, raidId: number): Promise<string> {
    return await this.#client.actionMutex.runExclusive(async () => {
      if (!(await this.#client.joinClan(clanId))) throw new JoinClanError();
      return await this.#client.fetchText("clan_viewraidlog.php", {
        searchParams: {
          viewlog: raidId,
          backstart: 0,
        },
      });
    });
  }

  async getRaidIds(
    clanId: number,
    exclude: number[] = [],
  ): Promise<number[]> {
    return await this.#client.actionMutex.runExclusive(async () => {
      if (!(await this.#client.joinClan(clanId))) throw new JoinClanError();
      let raidLogs = await this.#client.fetchText("clan_oldraidlogs.php");
      const raidIds: number[] = [];
      let row = 0;
      let done = false;
      while (
        !raidLogs.includes("No previous Clan Dungeon records found") &&
        !done
      ) {
        const matches =
          raidLogs.match(
            /kisses<\/td><td class=tiny>\[<a href="clan_viewraidlog\.php\?viewlog=(?<id>\d+)/g,
          ) || [];
        for (const id of matches) {
          const cleanId = Number(id.replace(/\D/g, ""));
          if (exclude.includes(cleanId)) {
            done = true;
            break;
          }
          raidIds.push(cleanId);
        }
        if (!done) {
          row += 10;
          raidLogs = await this.#client.fetchText("clan_oldraidlogs.php", {
            searchParams: {
              startrow: row,
            },
          });
        }
      }
      return raidIds;
    });
  }
}
