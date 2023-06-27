import { expect, test } from "vitest";

import { validPlayerIdentifier } from "./whois.js";

test("real queries pass validation", () => {
  const validQueries = [
    "beldur",
    "Butts McGruff",
    "greenfrog74",
    "Manendra",
    "monkeyman200",
    "phreddrickkv2",
    "gausie",
    "SSBBHax",
    "captain scotch",
    "Shiverwarp",
    "zarefore",
    "1197090",
  ];

  for (const query of validQueries) {
    expect(validPlayerIdentifier(query), query).toBe(true);
  }
});

test("fake queries fail validation", () => {
  const invalidQueries = ["1gausie", "f@rt"];

  for (const query of invalidQueries) {
    expect(validPlayerIdentifier(query), query).toBe(false);
  }
});
