import { parse } from "date-fns";
import { type Player } from "kol.js";

export class SnapshotClient {
  static toLink(input: string) {
    return `https://api.aventuristo.net/av-snapshot?u=${encodeURI(input)}`;
  }

  async getInfo(player: Player) {
    const link = SnapshotClient.toLink(player.name);
    const response = await fetch(link);
    if (response.status !== 200) return null;
    const data = await response.text();
    if (!data) return null;
    const dateString = data.match(
      /taken (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/,
    )?.[1];
    if (!dateString) return null;
    const date = parse(dateString, "yyyy-MM-dd HH:mm:ss", new Date());
    return { date, link };
  }
}

export const snapshotClient = new SnapshotClient();
