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

export class ClanDungeon {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getRaidLog(clanId: number): Promise<string> {
    return await this.#client.actionMutex.runExclusive(async () => {
      if (!(await this.#client.joinClan(clanId))) throw new JoinClanError();
      const log = await this.#client.fetchText("clan_raidlogs.php");
      if (!log) throw new RaidLogMissingError();
      return log;
    });
  }

  async getFinishedRaidLog(raidId: number): Promise<string> {
    return await this.#client.fetchText("clan_viewraidlog.php", {
      searchParams: {
        viewlog: raidId,
        backstart: 0,
      },
    });
  }

  async getMissingRaidLogs(
    clanId: number,
    parsedRaids: number[],
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
          if (parsedRaids.includes(cleanId)) {
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
