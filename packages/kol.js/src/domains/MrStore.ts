import type { Client } from "../Client.js";

export const MrStoreUrgency = {
  None: 0,
  Soon: 1,
  Today: 2,
} as const;

export type MrStoreUrgency = (typeof MrStoreUrgency)[keyof typeof MrStoreUrgency];

export type MrStoreItem = {
  name: string;
  descid: number;
  image: string;
  cost: number;
  currency: "mr_accessory" | "uncle_buck";
  category: string;
  urgency: MrStoreUrgency;
};

function parseUrgency(box: string): MrStoreUrgency {
  if (box.includes("leave the store today")) return MrStoreUrgency.Today;
  if (box.includes("leave the store soon")) return MrStoreUrgency.Soon;
  return MrStoreUrgency.None;
}

export class MrStore {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async getCurrentItems(): Promise<MrStoreItem[]> {
    const page = await this.#client.fetchText("mrstore.php");
    return MrStore.parse(page);
  }

  static parse(page: string): MrStoreItem[] {
    const boxPattern =
      /<div\s+id=div\d+\s+width=320\s+class=mrbox>([\s\S]*?)<\/div>/g;

    const items: MrStoreItem[] = [];

    for (const boxMatch of page.matchAll(boxPattern)) {
      const box = boxMatch[1];

      const category = box.match(/<b style="color: white">(.+?)<\/b>/)?.[1];
      const descid = box.match(/descitem\((\d+)\)/)?.[1];
      const name = box.match(/class=nounder>(.+?)<\/a>/)?.[1];
      const image = box.match(/itemimages\/(.+?\.gif)/)?.[1];
      const cost = box.match(/<font size=\+1>(\d+)<\/font>/)?.[1];
      const isUncleBuck = box.includes("unclebuck.gif");

      if (!category || !descid || !name || !image || !cost) continue;

      const urgency = parseUrgency(box);

      items.push({
        name,
        descid: Number(descid),
        image,
        cost: Number(cost),
        currency: isUncleBuck ? "uncle_buck" : "mr_accessory",
        category,
        urgency,
      });
    }

    return items;
  }
}
