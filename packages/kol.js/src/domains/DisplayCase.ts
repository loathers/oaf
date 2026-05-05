import { decodeHTML } from "entities";

import type { Client, Result } from "../Client.js";

function noDisplayCase(html: string): boolean {
  return html.includes("You don't have a collection.") || html.includes("You don't have a display case.");
}

export type DisplayCaseShelf = { id: number; name: string };

export type DisplayCaseItem = {
  id: number;
  name: string;
  quantity: number;
  shelfId: number;
};

export type PublicDisplayCaseItem = {
  name: string;
  descId: number;
  image: string;
  quantity: number;
};

export type PublicDisplayCaseShelf = {
  name: string;
  items: PublicDisplayCaseItem[];
};

export type PublicDisplayCase = {
  playerId: number;
  playerName: string;
  description: string | null;
  shelves: PublicDisplayCaseShelf[];
};

export class DisplayCase {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  async get(): Promise<{ shelves: DisplayCaseShelf[]; items: DisplayCaseItem[] }> {
    const html = await this.#client.fetchText("managecollectionshelves.php");
    return DisplayCase.parseOwn(html);
  }

  static parseOwn(html: string): { shelves: DisplayCaseShelf[]; items: DisplayCaseItem[] } {
    if (html.includes("You don't have anything in your collection.")) {
      return { shelves: [], items: [] };
    }

    const shelvesJson = html.match(/var shelves = (\{.*?\});/s)?.[1] ?? "{}";
    const shelvesRaw = JSON.parse(shelvesJson) as Record<string, string>;
    const shelves: DisplayCaseShelf[] = Object.entries(shelvesRaw).map(([id, name]) => ({
      id: Number(id),
      name,
    }));

    const items: DisplayCaseItem[] = [
      ...html.matchAll(
        /<tr[^>]*><td>([^<]+?)(?:\s\((\d+)\))?<\/td><td><\/td><td id='shelf_(\d+)'><a[^>]*addform\(\d+,\s*(\d+)\)/g,
      ),
    ].map(([, name, quantity, itemId, shelfId]) => ({
      id: Number(itemId),
      name: decodeHTML(name),
      quantity: quantity !== undefined ? Number(quantity) : 1,
      shelfId: Number(shelfId),
    }));

    return { shelves, items };
  }

  async hasDisplayCase(): Promise<boolean> {
    const html = await this.#client.fetchText("managecollection.php");
    return !noDisplayCase(html);
  }

  async deposit(itemId: number, quantity: number): Promise<Result> {
    const html = await this.#client.fetchText("managecollection.php", {
      method: "POST",
      form: { action: "put", whichitem: itemId, howmany: quantity, ajax: 1 },
    });
    if (html.includes("moved from inventory to case")) return { success: true };
    if (noDisplayCase(html)) return { success: false, reason: "No display case" };
    return { success: false, reason: "Unknown" };
  }

  async withdraw(itemId: number, quantity: number): Promise<Result> {
    const html = await this.#client.fetchText("managecollection.php", {
      method: "POST",
      form: { action: "take", whichitem: itemId, howmany: quantity, ajax: 1 },
    });
    if (html.includes("moved from case to inventory")) return { success: true };
    if (noDisplayCase(html)) return { success: false, reason: "No display case" };
    return { success: false, reason: "Unknown" };
  }

  async arrange(assignments: { itemId: number; shelfId: number }[]): Promise<Result> {
    const form: Record<string, string | number | boolean> = { action: "arrange" };
    for (const { itemId, shelfId } of assignments) {
      form[`whichshelf${itemId}`] = shelfId;
    }
    const html = await this.#client.fetchText("managecollectionshelves.php", {
      method: "POST",
      form,
    });
    if (noDisplayCase(html)) return { success: false, reason: "No display case" };
    return { success: true };
  }

  async getPlayer(playerId: number): Promise<PublicDisplayCase | null> {
    const html = await this.#client.fetchText("displaycollection.php", {
      query: { who: playerId },
    });
    return DisplayCase.parsePlayer(html, playerId);
  }

  static parsePlayer(html: string, playerId: number): PublicDisplayCase | null {
    const playerName = html.match(
      /Display Case \(<a[^>]*>([^<]+)<\/a>\)/,
    )?.[1];
    if (!playerName) return null;
    if (html.includes("This player doesn't have a display case")) return null;

    const descriptionRaw = html.match(
      /displaycase\.gif[^>]*>.*?<td valign=center>(.*?)<\/td>/s,
    )?.[1] ?? "";
    const descriptionText = descriptionRaw.replace(/<[^>]+>/g, "").trim();
    const description = descriptionText.length > 0 ? decodeHTML(descriptionText) : null;

    const shelves: PublicDisplayCaseShelf[] = [
      ...html.matchAll(
        /<font color=white>(.*?)<\/font>.*?<span id='shelf\d+'>([\s\S]*?)<\/span>/g,
      ),
    ].map(([, shelfName, shelfContent]) => {
      const rawItems = [
        ...shelfContent.matchAll(
          /<img src="([^"]+)"[^>]*onClick='descitem\((\d+),\d+\)'.*?<b>(.*?)<\/b>/g,
        ),
      ];

      const counts = new Map<string, PublicDisplayCaseItem>();
      for (const [, image, descId, name] of rawItems) {
        const key = `${descId}`;
        const existing = counts.get(key);
        if (existing) {
          existing.quantity++;
        } else {
          counts.set(key, {
            name: decodeHTML(name),
            descId: Number(descId),
            image,
            quantity: 1,
          });
        }
      }

      return {
        name: decodeHTML(shelfName),
        items: [...counts.values()],
      };
    });

    return { playerId, playerName, description, shelves };
  }
}
