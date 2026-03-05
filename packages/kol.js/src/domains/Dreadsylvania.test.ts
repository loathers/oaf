import { beforeAll, describe, expect, test } from "vitest";
import { loadFixture } from "../testUtils.js";
import {
  Dreadsylvania,
  type DreadStatus,
  type Participation,
} from "./Dreadsylvania.js";

let raidLog: string;
let participation: Participation = {};

beforeAll(async () => {
  raidLog = await loadFixture(import.meta.dirname, "raidlog.html");
  participation = Dreadsylvania.mergeParticipation(
    {},
    ...Dreadsylvania.parseParticipation(raidLog),
  );
});

const LAGGYCAT = 3137318;
const SWAGGERFORTUNE = 3268818;

describe("parseOverview", () => {
  let overview: DreadStatus;

  beforeAll(() => {
    overview = Dreadsylvania.parseOverview(raidLog);
  });

  test("Can parse kill counts", () => {
    expect(overview.forest).toBe(973);
    expect(overview.village).toBe(1000);
    expect(overview.castle).toBe(516);
  });

  test("Can parse capacitor status", () => {
    expect(overview.capacitor).toBe(true);
  });

  test("Can parse skills remaining", () => {
    expect(overview.skills).toBe(2);
  });

  test("Can predict bosses", () => {
    expect(overview.bosses).toHaveLength(3);
  });
});

describe("Participation", () => {
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
});
