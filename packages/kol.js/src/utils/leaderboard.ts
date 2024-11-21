import { selectAll, selectOne } from "css-select";
import { parseDocument } from "htmlparser2";
import { isComment, Text } from "domhandler";
import { innerText } from "domutils";

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

const blankNode = new Text("");

export function parseLeaderboard(page: string): LeaderboardInfo {
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
          updated:
            subboard.nextSibling && isComment(subboard.nextSibling)
              ? new Date(subboard.nextSibling.data.slice(9, -1))
              : null,
        };
      }),
  };
}
