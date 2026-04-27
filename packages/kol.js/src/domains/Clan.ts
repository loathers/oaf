import type { Client } from "../Client.js";

type Result = { success: true } | { success: false; reason: string };

export type ClanInfo = {
  id: number;
  name: string;
  leader: { id: number; name: string };
  credo: string;
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
    return {
      id: Number(idMatch[1]),
      name,
      leader: { id: Number(leaderMatch[1]), name: leaderMatch[2] },
      credo,
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
