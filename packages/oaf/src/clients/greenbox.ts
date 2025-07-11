type Player = {
  playerId: number;
  playerName: string;
  greenbox: {
    createdAt: Date;
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

    const result = await response.json();

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

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  }

  async getInfo(playerId: number) {
    const response = await fetch(
      `https://greenbox.loathers.net/api/player/${playerId}`,
    );
    const data = await response.json();
    if (!response.ok) {
      return null;
    }
    return (data as Player).greenbox;
  }
}

export const greenboxClient = new GreenboxClient();
