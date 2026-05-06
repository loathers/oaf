import type { Client, Result } from "../Client.js";

export const Privilege = {
  Approve:                0b0000_0000_0000_0000_0001,
  ChangeRank:             0b0000_0000_0000_0000_0010,
  Boot:                   0b0000_0000_0000_0000_0100,
  KarmaExempt:            0b0000_0000_0000_0000_1000,
  BuyFurniture:           0b0000_0000_0000_0001_0000,
  ViewLog:                0b0000_0000_0000_0010_0000,
  PostAnnouncement:       0b0000_0000_0000_0100_0000,
  Attack:                 0b0000_0000_0000_1000_0000,
  EditWhitelist:          0b0000_0000_0001_0000_0000,
  WithdrawZeroKarmaItems: 0b0000_0000_0100_0000_0000,
  ChangeTitles:           0b0000_0000_1000_0000_0000,
  DeleteMessages:         0b0000_0001_0000_0000_0000,
  DeleteAnnouncement:     0b0000_0010_0000_0000_0000,
  ChangeAllTitles:        0b0000_0100_0000_0000_0000,
  ViewWhitelist:          0b0000_1000_0000_0000_0000,
  BuyClanBoosts:          0b0001_0000_0000_0000_0000,
  BuyWarStuff:            0b0010_0000_0000_0000_0000,
  ForumAdministrator:     0b0100_0000_0000_0000_0000,
  ForumModerator:         0b1000_0000_0000_0000_0000,
} as const;

export const DungeonPrivilege = {
  AdventureHobopolis:      0b0000_0000_0001,
  AdministerHobopolis:     0b0000_0000_0010,
  AdventureSlimeTube:      0b0000_0000_0100,
  AdministerSlimeTube:     0b0000_0000_1000,
  AdventureAllDungeons:    0b0000_0100_0000,
  AdministerAllDungeons:   0b0000_1000_0000,
  AdventureDreadsylvania:  0b0001_0000_0000,
  AdministerDreadsylvania: 0b0010_0000_0000,
  EditWhiteboard:          0b0100_0000_0000,
} as const;

export type ClanRank = {
  id: number;
  name: string;
  degree: number;
  privileges: number;
  dungeonPrivileges: number;
  karmaLimit: number;
  zeroKarmaLimit: number;
};

export type ClanInfo = {
  id: number;
  name: string;
  leader: { id: number; name: string };
  credo: string;
  website: string | null;
  memberCount: number;
  trophies: Record<string, number>;
};

export class Clan {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getInfo(clanId: number): Promise<ClanInfo | null> {
    const html = await this.#client.fetchText("showclan.php", {
      query: { whichclan: clanId },
    });
    const name = html.match(/<b style="color: white">([^<]+)<\/b>/)?.[1] ?? null;
    const leaderMatch = html.match(/href="showplayer\.php\?who=(\d+)">([^<]+)<\/a><\/b>, Level/);
    const credo = html.match(/<b>Credo:<\/b><br>([^<]+)/)?.[1]?.trim() ?? null;
    const idMatch = html.match(/name=whichclan value=(\d+)/);
    if (!name || !leaderMatch || !credo || !idMatch) return null;

    const website = html.match(/Website: <a[^>]+href='([^']+)'/)?.[1] ?? null;

    const pageOptions = [...html.matchAll(/<option[^>]*>(\d+) - (\d+)<\/option>/g)];
    const memberCount =
      pageOptions.length > 0
        ? Number(pageOptions[pageOptions.length - 1][2])
        : [...html.matchAll(/<a class=nounder href="showplayer\.php\?who=\d+">/g)].length;

    const trophies = Object.fromEntries([...html.matchAll(/desc_clantrophy\.php[^<]*<\/td><td valign=center><b>([^<]+)<\/b> \((\d+)\)/g)].map(([, name, count]) => [name, Number(count)]));

    return {
      id: Number(idMatch[1]),
      name,
      leader: { id: Number(leaderMatch[1]), name: leaderMatch[2] },
      credo,
      website,
      memberCount,
      trophies,
    };
  }

  async transferLeadership(playerId: number): Promise<Result> {
    const result = await this.#client.fetchText("clan_admin.php", {
      method: "POST",
      form: { action: "changeleader", newleader: playerId, confirm: "on" },
    });
    if (result.includes("Leadership of clan transferred")) return { success: true };
    if (result.trim() === "") return { success: false, reason: "Insufficient clan admin rights" };
    return { success: false, reason: "Unknown" };
  }

  async getRanks(): Promise<ClanRank[]> {
    const html = await this.#client.fetchText("clan_editranks.php");
    const orChecked = (block: string, prefix: string) =>
      [...block.matchAll(new RegExp(`name=${prefix}\\d+[^>]*value=(\\d+) checked`, "g"))].reduce<number>(
        (acc, [, v]) => acc | Number(v),
        0,
      );
    const namedRanks = [...html.matchAll(/<form action=clan_editranks\.php[^>]*>([\s\S]*?)<\/form>/g)].map(
      ([, block]) => ({
        id: Number(block.match(/name=whichlevel value=(\d+)/)?.[1] ?? 0),
        name: block.match(/name=levelname value="([^"]+)"/)?.[1] ?? "",
        degree: Number(block.match(/id='degreeold\d+'>(\d+)/)?.[1] ?? 0),
        privileges: orChecked(block, "priv"),
        dungeonPrivileges: orChecked(block, "cdpriv"),
        karmaLimit: Number(block.match(/name=karmalimit value="(\d+)"/)?.[1] ?? 0),
        zeroKarmaLimit: Number(block.match(/name=zerokarmalimit value="(\d+)"/)?.[1] ?? 0),
      }),
    );
    return [
      ...namedRanks,
      { id: 0, name: "Normal Member", degree: 0, privileges: 0, dungeonPrivileges: 0, karmaLimit: 0, zeroKarmaLimit: 0 },
    ].sort((a, b) => b.degree - a.degree);
  }

  async setPlayerRank(playerId: number, rankId?: number, title?: string): Promise<Result> {
    const result = await this.#client.fetchText("clan_members.php", {
      method: "POST",
      form: {
        action: "modify",
        begin: 1,
        "pids[]": playerId,
        ...(rankId !== undefined && { [`level${playerId}`]: rankId }),
        ...(title !== undefined && { [`title${playerId}`]: title }),
      },
    });
    if (result.includes("Modified level for")) return { success: true };
    if (result.includes("Modifications made:</td>")) return { success: false, reason: "Player not in clan" };
    return { success: false, reason: "Unknown" };
  }

  async addPlayerToWhitelist(playerId: number, clanId: number): Promise<Result> {
    return await this.#client.actionMutex.runExclusive(async () => {
      const join = await this.#client.joinClan(clanId);
      if (!join.success) return join;
      await this.#client.fetchText("clan_whitelist.php", {
        query: {
          addwho: playerId,
          level: 2,
          title: "",
          action: "add",
        },
      });
      return { success: true };
    });
  }
}
