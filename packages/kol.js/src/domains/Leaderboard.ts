import { selectAll, selectOne } from "css-select";
import { parseDocument } from "htmlparser2";
import { Element, isComment, Text } from "domhandler";
import { innerText } from "domutils";

import type { Client } from "../Client.js";

export type LeaderboardInfo = {
  name: string;
  boards: SubboardInfo[];
};

export type SubboardInfo = {
  name: string;
  runs: RunInfo[];
  updated: Date | null;
};

export type RunInfo = {
  playerName: string;
  playerId: number;
  days: string;
  turns: string;
};

const BOARD_MAPPINGS = {
  "Clan Dungeons": 8,
  "Bees Hate You": 9,
  "Way of the Surprising Fist": 10,
  Trendy: 11,
  "Avatar of Boris": 12,
  "Bugbear Invasion": 13,
  "Zombie Slayer": 14,
  "Class Act": 15,
  "Avatar of Jarlsberg": 16,
  "BIG!": 17,
  KOLHS: 18,
  "Class Act II": 19,
  "Avatar of Sneaky Pete": 20,
  "Slow and Steady": 21,
  "Heavy Rains": 22,
  Picky: 23,
  "Actually Ed the Undying": 24,
  "One Crazy Random Summer": 25,
  "Community Service": 26,
  Batfellow: 27,
  "Avatar of West of Loathing": 28,
  "The Source": 29,
  "Nuclear Autumn": 30,
  "Gelatinous Noob": 31,
  "License to Adventure": 32,
  "Live. Ascend. Repeat.": 33,
  "Pocket Familiars": 34,
  "G Lover": 35,
  "Disguises Delimit": 36,
  "Dark Gyffte": 37,
  "Two Crazy Random Summer": 38,
  "Kingdom of Exploathing": 39,
  "Path of the Plumber": 40,
  "Low Key Summer": 41,
  "Grey Goo": 42,
  "You, Robot": 43,
  "Quantum Terrarium": 44,
  "Wild Fire": 45,
  "Grey You": 46,
  Journeyman: 47,
  "Fall of the Dinosaurs": 48,
  "Avatars of Shadows Over Loathing": 49,
  "Legacy of Loathing": 50,
  "A Shrunken Adventurer am I": 51,
  WereProfessor: 52,
  "11 Things I Hate About U": 53,
  "Avant Guard": 54,
  "Z is for Zootomist": 55,
  "Hat Trick": 56,
  "11,037 Leagues Under the Sea": 57,
  Standard: 999,
  "Elf Gratitude": 900,
} as const;

export { BOARD_MAPPINGS };

export type BoardName = keyof typeof BOARD_MAPPINGS;

const blankNode = new Text("");

export class Leaderboard {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  static get boardNames(): BoardName[] {
    return Object.keys(BOARD_MAPPINGS) as BoardName[];
  }

  static boardIdFor(name: BoardName): number {
    return BOARD_MAPPINGS[name];
  }

  static boardIdForStandardYear(year: number): number {
    if (year === new Date().getFullYear()) return 999;
    return 998 + 2015 - year;
  }

  static parse(page: string): LeaderboardInfo {
    const doc = parseDocument(page);
    const [container, ...boards] = selectAll("table", doc);

    return {
      name: innerText(selectOne("tr", container) ?? blankNode)
        .replace(/\s+/g, " ")
        .trim(),
      boards: boards
        .slice(1)
        .filter((board) => {
          if (selectAll(":scope > tr, :scope > tbody > tr", board).length <= 1)
            return false;
          const text = innerText(selectOne("tr", board) ?? blankNode);
          return text.match(/^((Fast|Funn|B)est|Most (Goo|Elf))/);
        })
        .map((subboard) => {
          const rows = selectAll("tr", subboard);

          return {
            name: innerText(rows[0]),
            runs: selectAll("td tr", rows[1])
              .slice(2)
              .map((node) => {
                const rowText = selectAll("td", node).map((col) =>
                  innerText(col).replace(/&amp;nbsp;/g, ""),
                );
                const playerLink = (selectOne("a", node) as Element | null)
                  ?.attribs.href;
                const hasTwoNumbers = !!parseInt(rowText[rowText.length - 2]);
                return {
                  playerName: rowText
                    .slice(0, rowText.length - (hasTwoNumbers ? 2 : 1))
                    .join("")
                    .trim()
                    .toString(),
                  playerId: Number(
                    playerLink?.substring(playerLink.indexOf("who=") + 4) ??
                      "0",
                  ),
                  days: hasTwoNumbers
                    ? rowText[rowText.length - 2].toString() || "0"
                    : "",
                  turns: rowText[rowText.length - 1].toString() || "0",
                };
              }),
            updated:
              subboard.nextSibling && isComment(subboard.nextSibling)
                ? new Date(subboard.nextSibling.data.slice(9, -1))
                : null,
          };
        }),
    };
  }

  async getLeaderboard(boardId: number): Promise<LeaderboardInfo> {
    const page = await this.#client.fetchText("museum.php", {
      query: {
        floor: 1,
        place: "leaderboards",
        whichboard: boardId,
      },
    });

    return Leaderboard.parse(page);
  }
}
