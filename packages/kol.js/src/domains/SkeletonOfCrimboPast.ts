import type { Client } from "../Client.js";

export interface DailySpecial {
  descId: number;
  price: number;
}

export class SkeletonOfCrimboPast {
  #client: Client;
  #hasFamiliar: boolean | null = null;

  constructor(client: Client) {
    this.#client = client;
  }

  async hasFamiliar(): Promise<boolean> {
    if (this.#hasFamiliar === null) {
      const fams = await this.#client.getFamiliars();
      this.#hasFamiliar = fams.some((f) => f.id === 326);
    }
    return this.#hasFamiliar;
  }

  async getDailySpecial(): Promise<DailySpecial | null> {
    if (!(await this.hasFamiliar())) return null;

    const page = await this.#client.fetchText("main.php", {
      searchParams: { talktosocp: "1" },
    });

    const match = page.match(
      /Daily Special:.*?descitem\((\d+)\).*?\((\d+) knucklebones\)/,
    );

    if (!match) return null;
    return { descId: Number(match[1]), price: Number(match[2]) };
  }
}
