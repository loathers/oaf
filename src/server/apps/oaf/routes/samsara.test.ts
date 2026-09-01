import { describe, expect, test } from "vitest";

import { formatRecord } from "./samsara.js";

const BLUE = { value: "blue", label: "Blue Team" };
const URL = "https://samsara.loathers.net/path/blue-vs-red?board=blue";

describe("formatRecord", () => {
  test("Renames the pathless path", () => {
    expect(formatRecord({ lifestyle: "HARDCORE", pathName: "None" })).toBe(
      "**Hardcore No Path**",
    );
  });

  test("Leaves an unsplit path alone", () => {
    expect(
      formatRecord({ lifestyle: "CASUAL", pathName: "Community Service" }),
    ).toBe("**Casual Community Service**");
  });

  test("Labels a board", () => {
    expect(
      formatRecord({
        lifestyle: "SOFTCORE",
        pathName: "Blue vs. Red",
        board: BLUE,
      }),
    ).toBe("**Softcore Blue vs. Red (Blue Team)**");
  });

  test("Links to the leaderboard", () => {
    expect(
      formatRecord({
        lifestyle: "SOFTCORE",
        pathName: "Blue vs. Red",
        board: BLUE,
        url: URL,
      }),
    ).toBe(`[**Softcore Blue vs. Red (Blue Team)**](${URL})`);
  });
});
