import type { Client } from "../Client.js";
import { Player } from "../Player.js";

export type RaffleWinner = {
  player: Player;
  item: number;
  tickets: number;
  place: number;
};

export type RaffleResult = {
  today: { first: number | null; second: number | null };
  yesterday: RaffleWinner[];
  gameday: number;
};

export class Raffle {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getRaffle(): Promise<RaffleResult> {
    const page = await this.#client.fetchText("raffle.php");

    const todayMatches = page.matchAll(
      /<tr><td align=right>(?:First|Second) Prize:<\/td>.*?descitem\((\d+)\)/g,
    );
    const [first, second] = await Promise.all(
      todayMatches
        ? [...todayMatches].map(
            async (p) => await this.#client.descIdToId(Number(p[1])),
          )
        : [null, null],
    );

    const winnerMatches = page.matchAll(
      /<tr><td class=small><a href='showplayer\.php\?who=\d+'>(.*?) \(#(\d+)\).*?descitem\((\d+)\).*?([\d,]+)<\/td><\/tr>/g,
    );
    const yesterday = await Promise.all(
      winnerMatches
        ? [...winnerMatches].map(async (w, i) => ({
            player: new Player(this.#client, Number(w[2]), w[1]),
            item: await this.#client.descIdToId(Number(w[3])),
            tickets: Number(w[4].replace(",", "")),
            place: Math.min(i + 1, 2),
          }))
        : [],
    );

    const { daynumber } = (await this.#client.fetchStatus()) ?? {
      daynumber: "0",
    };

    return {
      today: { first: first ?? null, second: second ?? null },
      yesterday,
      gameday: Number(daynumber),
    };
  }
}
