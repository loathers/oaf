import * as fs from "node:fs/promises";

import { Participation, getParticipationFromRaidLog } from "./skills";

import path = require("node:path");

let participation: Participation = {};

beforeAll(async () => {
  const file = path.join(__dirname, "../../", "tests/raidlog.html");
  const html = await fs.readFile(file, { encoding: "utf-8" });
  participation = getParticipationFromRaidLog(html);
});

test("Can parse raid log skills", () => {
  expect(participation["laggycat"]).toHaveProperty("skills", 1);

  const otherParticipantsSkills = Object.entries(participation)
    .filter(([u]) => u !== "laggycat")
    .reduce((sum, [u, { skills }]) => sum + skills, 0);

  expect(otherParticipantsSkills).toEqual(0);
});

test("Can parse raid log kills", () => {
  expect(participation["swaggerfortune"]).toHaveProperty("kills", 346);
  expect(participation["laggycat"]).toHaveProperty("kills", 0);

  const totalKills = Object.values(participation).reduce((sum, { kills }) => sum + kills, 0);

  expect(totalKills).toEqual(3677);
});
