import type { Client } from "../Client.js";

export type FlowerPrices = {
  red: number;
  white: number;
  blue: number;
};

export class FloralMercantileExchangeParseError extends Error {
  constructor() {
    super("Could not parse flower prices");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class FloralMercantileExchange {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getPrices(): Promise<FlowerPrices> {
    const page = await this.#client.fetchText(
      "shop.php?whichshop=flowertradein",
    );

    const result = FloralMercantileExchange.parse(page);
    if (!result) throw new FloralMercantileExchangeParseError();
    return result;
  }

  static parse(page: string): FlowerPrices | null {
    const pattern =
      /<tr rel="7567">.*?Chroner<\/b>&nbsp;<b>\((\d+)\)<\/b>.*?descitem\((\d+)\).*?<\/tr>/gs;
    const matches = [...page.matchAll(pattern)];

    if (matches.length !== 3) return null;

    const prices = matches.reduce<Record<string, number>>(
      (acc, m) => ({ ...acc, [m[2]]: Number(m[1]) }),
      {},
    );

    return {
      red: prices["973996072"] ?? 0,
      white: prices["156741343"] ?? 0,
      blue: prices["126513532"] ?? 0,
    };
  }
}
