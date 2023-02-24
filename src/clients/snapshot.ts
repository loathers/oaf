import axios from "axios";
import { parse } from "date-fns";

export class SnapshotClient {
  constructor() {}

  static toLink(input: string) {
    return `https://api.aventuristo.net/av-snapshot?u=${encodeURI(input.replace(/\s/g, "%20"))}`;
  }

  async getInfo(playerName: string) {
    const link = SnapshotClient.toLink(playerName);
    const { data, status } = await axios.get<string>(link);
    if (status !== 200 || !data) return null;
    const dateString = data.match(/taken (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/)?.[1];
    if (!dateString) return null;
    const date = parse(dateString, "yyyy-MM-dd HH:mm:ss", new Date());
    return { date, link };
  }
}

export const snapshotClient = new SnapshotClient();
