import { beforeAll, expect, test } from "vitest";

import { loadFixture } from "../../testUtils";
import { Participation, getParticipationFromRaidLog } from "./skills";

let participation: Participation = new Map();

beforeAll(async () => {
  participation = getParticipationFromRaidLog(await loadFixture(__dirname, "raidlog.html"));
});

const LAGGYCAT = 3137318;
const SWAGGERFORTUNE = 3268818;

test("Can parse raid log skills", () => {
  expect(participation.get(LAGGYCAT)).toHaveProperty("skills", 1);

  const otherParticipantsSkills = [...participation.entries()]
    .filter(([pid]) => pid !== LAGGYCAT)
    .reduce((sum, [, { skills }]) => sum + skills, 0);

  expect(otherParticipantsSkills).toEqual(0);
});

test("Can parse raid log kills", () => {
  expect(participation.get(SWAGGERFORTUNE)).toHaveProperty("kills", 346);
  expect(participation.get(LAGGYCAT)).toHaveProperty("kills", 0);

  const totalKills = [...participation.values()].reduce((sum, { kills }) => sum + kills, 0);

  expect(totalKills).toEqual(3677);
});
