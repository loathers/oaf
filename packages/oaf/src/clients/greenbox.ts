import { type Player } from "kol.js";

type GreenboxResponse = {
  playerId: number;
  playerName: string;
  greenbox: {
    createdAt: string;
    id: number;
    data: object;
  } | null;
};

export class GreenboxClient {
  static toLink(input: string) {
    return `https://greenbox.loathers.net/?u=${encodeURI(input)}`;
  }

  async update(playerId: number, playerName: string, greenboxString: string) {
    const response = await fetch(
      "https://greenbox.loathers.net/webhooks/update",
      {
        method: "POST",
        body: JSON.stringify({ playerId, playerName, greenboxString }),
        headers: { Authorization: `Bearer ${process.env.GREENBOX_TOKEN}` },
      },
    );

    const result: unknown = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  }

  async wipe(playerId: number) {
    const response = await fetch(
      "https://greenbox.loathers.net/webhooks/wipe",
      {
        method: "POST",
        body: JSON.stringify({ playerId }),
        headers: { Authorization: `Bearer ${process.env.GREENBOX_TOKEN}` },
      },
    );

    const result: unknown = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  }

  async getInfo(player: Player) {
    const response = await fetch(
      `https://greenbox.loathers.net/api/player/${player.id}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as GreenboxResponse;
    if (!data.greenbox) return null;
    return {
      link: `https://greenbox.loathers.net/?u=${player.id}`,
      date: new Date(data.greenbox.createdAt),
    };
  }
}

export const greenboxClient = new GreenboxClient();
