import type { Client } from "../Client.js";

export type BookmobileStatus = {
  copies: string;
  title: string;
  price: number;
};

export class BookmobileNotInTownError extends Error {
  constructor() {
    super("The Bookmobile is not in town");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BookmobileParseError extends Error {
  constructor() {
    super("Could not parse the Bookmobile page");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class Bookmobile {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async visit(): Promise<BookmobileStatus> {
    const page = await this.#client.actionMutex.runExclusive(async () => {
      await this.#client.fetchText("town.php");
      const p = await this.#client.fetchText("place.php", {
        query: { whichplace: "town_market", action: "town_bookmobile" },
      });
      if (p.includes("name=whichchoice")) {
        await this.#client.fetchText("choice.php", {
          body: new URLSearchParams({
            whichchoice: "1200",
            option: "2",
          }),
        });
      }
      return p;
    });

    if (!page.includes("name=whichchoice")) {
      throw new BookmobileNotInTownError();
    }

    const result = Bookmobile.parse(page);
    if (!result) throw new BookmobileParseError();
    return result;
  }

  static parse(page: string): BookmobileStatus | null {
    const pattern =
      /this week, I've got (.*?) copies of(?: the)? <b>(.*?)<\/b>.*?<b>([0-9,]+) Meat<\/b>/s;
    const match = page.match(pattern);

    if (!match) return null;
    const [, copies, title, price] = match;

    return { copies, title, price: Number(price.replaceAll(",", "")) };
  }
}
