import xpath, { select } from "xpath";
import { DOMParser } from "@xmldom/xmldom";

export type LeaderboardInfo = {
  name: string;
  boards: SubboardInfo[];
};

export type SubboardInfo = {
  name: string;
  runs: RunInfo[];
  updated: Date | null;
};

type RunInfo = {
  player: string;
  days: string;
  turns: string;
};

const parser = new DOMParser({
  locator: {},
  errorHandler: {
    warning: () => {},
    error: () => {},
    fatalError: console.error,
  },
});

const selectMulti = (expression: string, node: Node) => {
  const selection = select(expression, node);
  if (Array.isArray(selection)) return selection;
  return selection instanceof Node ? [selection] : [];
};

export function parseLeaderboard(page: string): LeaderboardInfo {
  const document = parser.parseFromString(page);
  const [board, ...boards] = selectMulti("//table", document);

  return {
    name: selectMulti(".//text()", board.firstChild!)
      .map((node) => node.nodeValue)
      .join("")
      .replace(/\s+/g, " ")
      .trim(),
    boards: boards
      .slice(1)
      .filter(
        (board) =>
          selectMulti("./tr//text()", board)[0]?.nodeValue?.match(
            /^((Fast|Funn|B)est|Most (Goo|Elf))/,
          ) && selectMulti("./tr", board).length > 1,
      )
      .map((subboard) => {
        const rows = selectMulti("./tr", subboard);

        return {
          name: (selectMulti(".//text()", rows[0])[0]?.nodeValue || "").trim(),
          runs: selectMulti("./td//tr", rows[1])
            .slice(2)
            .map((node) => {
              const rowText = selectMulti(".//text()", node).map((text) =>
                text.toString().replace(/&amp;nbsp;/g, ""),
              );
              const hasTwoNumbers = !!parseInt(rowText[rowText.length - 2]);
              return {
                player: rowText
                  .slice(0, rowText.length - (hasTwoNumbers ? 2 : 1))
                  .join("")
                  .trim()
                  .toString(),
                days: hasTwoNumbers
                  ? rowText[rowText.length - 2].toString() || "0"
                  : "",
                turns: rowText[rowText.length - 1].toString() || "0",
              };
            }),
          updated: xpath.isComment(subboard.nextSibling)
            ? new Date(subboard.nextSibling.data.slice(9, -1))
            : null,
        };
      }),
  };
}
