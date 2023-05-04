import { beforeAll, expect, test } from "vitest";

import { loadFixture } from "../../testUtils";
import { Participation, getParticipationFromRaidLog } from "./skills";

let participation: Participation = {};

beforeAll(async () => {
  participation = getParticipationFromRaidLog(await loadFixture(__dirname, "raidlog.html"));
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
