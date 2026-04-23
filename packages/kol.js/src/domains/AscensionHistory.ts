import type { Client } from "../Client.js";
import { parseKoLNumber, trim } from "../utils/utils.js";

export type Lifestyle = "CASUAL" | "SOFTCORE" | "HARDCORE";

export type Ascension = {
  ascensionNumber: number;
  playerId: number;
  date: Date;
  dropped: boolean;
  abandoned: boolean;
  level: number;
  className: string;
  sign: string;
  turns: number;
  days: number;
  familiarName: string | null;
  familiarImage: string | null;
  familiarPercentage: number;
  lifestyle: Lifestyle;
  pathName: string;
  extra: Record<string, number>;
};

export class AscensionHistory {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  static parse(page: string, playerId: number): Ascension[] {
    const rows = page.matchAll(
      /<\/tr>(?:<td.*?>.*?<\/td>){2}(?:<td colspan.*?>.*?<\/td>|(?:<td.*?>.*?<\/td>){7})/gs,
    );
    return [...rows].map((row) =>
      AscensionHistory.#parseRow(playerId, row[0]),
    );
  }

  static parsePlayer(page: string): { id: number; name: string } | null {
    const match = page.match(
      /\(<a href="showplayer.php\?who=(\d+)".*?><font.*?>(.*?)<\/font><\/a>\)/,
    );
    if (!match || match[1] === "0") return null;
    return { id: parseInt(match[1]), name: match[2] };
  }

  async getAscensions(
    playerId: number,
    options: { includePreNS13?: boolean } = {},
  ): Promise<Ascension[] | null> {
    if (!options.includePreNS13) {
      const post = await this.#client.fetchText("ascensionhistory.php", {
        query: { who: playerId },
      });
      if (!AscensionHistory.parsePlayer(post)) return null;
      return AscensionHistory.parse(post, playerId);
    }

    const pre = await this.#client.fetchText("ascensionhistory.php", {
      query: { who: playerId, prens13: 1 },
    });
    if (!AscensionHistory.parsePlayer(pre)) return null;

    const post = await this.#client.fetchText("ascensionhistory.php", {
      query: { who: playerId },
    });
    return [
      ...AscensionHistory.parse(pre, playerId),
      ...AscensionHistory.parse(post, playerId),
    ];
  }

  static #textContent(s: string) {
    return s.match(/<span.*?>(.*?)<\/span>/)?.[1] ?? s;
  }

  static #extractTitle(s: string | undefined) {
    return s?.match(/title="(.*?)"/s)?.[1];
  }

  static #parseFamiliarImage(s: string | null): string | null {
    if (!s) return null;
    const filename = (s.split("/").pop() ?? "nopic.gif").slice(0, -4);
    switch (filename) {
      case "camelfam_left":
        return "camelcalf";
      case "righthandbody":
        return "lhmlarva";
      default:
        return filename;
    }
  }

  static #parseLifestyle(restrictions: string): Lifestyle {
    if (restrictions.includes("beanbag.gif")) return "CASUAL";
    if (restrictions.includes("hardcorex.gif")) return "HARDCORE";
    return "SOFTCORE";
  }

  static #parseExtra(extra: string): Record<string, number> {
    if (extra === "") return {};
    return Object.fromEntries(
      extra.split(", ").map((pair) => {
        const [value, ...key] = pair.includes(": ")
          ? pair.split(": ").reverse()
          : pair.split(" ");
        return [key.join(" "), Number(value.replace(/,/g, ""))];
      }),
    );
  }

  static #parsePath(path: string): [string, Record<string, number>] {
    const parts =
      path.match(/(.*?) \((.*?)\)/) ||
      path.match(/(.*?)\s*\n\s*(.*)/s) || [null, path, ""];
    return [parts[1] as string, AscensionHistory.#parseExtra(parts[2] as string)];
  }

  static #parseDate(d: string): Date {
    const [month, day, year] = d.split("/");
    return new Date(`20${year}-${month}-${day}`);
  }

  static #parseSign(sign: string): string {
    return !sign || sign === "(none)" ? "None" : sign;
  }

  static #parseIndex(index: string): [number, boolean] {
    // The ascension index can have multiple asterisks:
    // 1. Dropped path
    // 2. Replaced familiar with a Crimbo Shrub in Picky
    // 3. ? Perhaps one day
    // All treated as a dropped path.
    const match = index.match(/(\d+)(\*?)/);
    if (!match) return [0, false];
    return [parseInt(match[1]), match[2].length > 0];
  }

  static #parseRow(playerId: number, row: string): Ascension {
    const cells = [...row.matchAll(/<td.*?>(.*?)<\/td>/gs)].map((cell) =>
      trim(cell[1]),
    );

    const [ascensionNumber, dropped] = AscensionHistory.#parseIndex(cells[0]);
    const base = {
      ascensionNumber,
      playerId,
      date: AscensionHistory.#parseDate(cells[1]),
      dropped,
    };

    if (cells.length === 3) {
      return {
        ...base,
        abandoned: true,
        level: 0,
        className: "None",
        sign: "None",
        turns: 0,
        days: 0,
        familiarName: null,
        familiarImage: null,
        familiarPercentage: 0,
        lifestyle: "SOFTCORE",
        pathName: "None",
        extra: {},
      };
    }

    const familiar = (AscensionHistory.#extractTitle(cells[7]) ?? "").match(
      /^(.*?) \(([\d.]+)%\)/,
    );
    const familiarImage = AscensionHistory.#parseFamiliarImage(
      cells[7]?.match(/<img.*?src="(.*?)"/)?.[1] ?? null,
    );

    const restrictions = cells[8].split("<img");
    const [pathName, extra] = AscensionHistory.#parsePath(
      AscensionHistory.#extractTitle(restrictions[2]) ?? "None",
    );

    return {
      ...base,
      abandoned: false,
      level: parseKoLNumber(AscensionHistory.#textContent(cells[2])),
      className: AscensionHistory.#extractTitle(cells[3]) ?? "None",
      sign: AscensionHistory.#parseSign(cells[4]),
      turns: parseKoLNumber(AscensionHistory.#textContent(cells[5])),
      days: parseKoLNumber(AscensionHistory.#textContent(cells[6])),
      familiarName: familiar?.[1] ?? null,
      familiarImage,
      familiarPercentage: parseFloat(familiar?.[2] ?? "0"),
      lifestyle: AscensionHistory.#parseLifestyle(restrictions[1]),
      pathName,
      extra,
    };
  }
}
