import { beforeAll, expect, test } from "vitest";

import { loadFixture } from "../../testUtils.js";
import {
  Participation,
  getParticipationFromRaidLog,
  mergeParticipation,
} from "./skills.js";

let participation: Participation = {};

beforeAll(async () => {
  participation = mergeParticipation(
    {},
    ...getParticipationFromRaidLog(
      await loadFixture(__dirname, "raidlog.html"),
    ),
  );
});

const LAGGYCAT = 3137318;
const SWAGGERFORTUNE = 3268818;

test("Can parse raid log skills", () => {
  expect(participation[LAGGYCAT]).toHaveProperty("skills", 1);

  const otherParticipantsSkills = Object.values(participation)
    .filter(({ playerId }) => playerId !== LAGGYCAT)
    .reduce((sum, { skills }) => sum + skills, 0);

  expect(otherParticipantsSkills).toEqual(0);
});

test("Can parse raid log kills", () => {
  expect(participation[SWAGGERFORTUNE]).toHaveProperty("kills", 346);
  expect(participation[LAGGYCAT]).toHaveProperty("kills", 0);

  const totalKills = Object.values(participation).reduce(
    (sum, { kills }) => sum + kills,
    0,
  );

  expect(totalKills).toEqual(3677);
});
