import type { Client } from "../Client.js";

export type TTTScores = {
  solenoids: number;
  bearings: number;
};

export function parseScores(page: string): TTTScores | null {
  const pattern = /title='(-?\d+)' href=adventure.php\?snarfblat=(581|582)/gs;
  const matches = [...page.matchAll(pattern)];

  if (matches.length !== 2) return null;

  const scores = matches.reduce<Record<string, number>>(
    (acc, m) => ({ ...acc, [m[2]]: Number(m[1]) }),
    {},
  );

  return {
    solenoids: scores["581"] ?? 0,
    bearings: scores["582"] ?? 0,
  };
}

export class AutomatedFuture {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async visit(): Promise<string> {
    return await this.#client.actionMutex.runExclusive(async () => {
      await this.#client.fetchText("town.php");
      return this.#client.fetchText("place.php", {
        query: { whichplace: "twitch" },
      });
    });
  }

  async getScores(): Promise<TTTScores | null> {
    const page = await this.visit();
    if (page.includes("faded back into the swirling mists")) return null;
    return parseScores(page);
  }
}
