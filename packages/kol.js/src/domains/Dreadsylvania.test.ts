import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { loadFixture } from "../testUtils.js";
import { Dreadsylvania, type DreadEvent } from "./Dreadsylvania.js";

function loadDreadFixture(name: string): string {
  return readFileSync(
    join(import.meta.dirname, "__fixtures__", "dread", name),
    "utf8",
  );
}

// Fixtures:
//   cdr1-current  — in-progress, capacitor fixed, lab+schoolhouse unlocked, 1 bugbear banish
//   cdr2-current  — in-progress, capacitor fixed, lab+schoolhouse unlocked
//   raid-218519   — completed, bosses: Falls-From-Sky / ZHA / Drunkula
//   raid-218286   — completed, 3 skills used, bosses: Great Wolf / ZHA / Skeleton
//   raid-218518   — completed, 3 skills used, bosses: Great Wolf / ZHA / Skeleton
//   raid-218205   — completed, has "hung" variant for village hanging
//   raid-218029   — completed, has auditor badge + agaricus
//   raid-217988   — completed, has watchtower, all details present
//   raid-213013   — completed, has "wasted some fruit" variant for kiwi
//   raidlog.html  — legacy fixture (active dungeon from original tests)

describe("parseOverview", () => {
  describe("remaining monsters", () => {
    test("in-progress dungeon", () => {
      const { overview } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
      expect(overview.forest.remaining).toBe(493);
      expect(overview.village.remaining).toBe(509);
      expect(overview.castle.remaining).toBe(661);
    });

    test("completed dungeon has 0 remaining", () => {
      const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
      expect(overview.forest.remaining).toBe(0);
      expect(overview.village.remaining).toBe(0);
      expect(overview.castle.remaining).toBe(0);
    });

    test("zone with no kills has 1000 remaining", async () => {
      const log = await loadFixture(import.meta.dirname, "raidlog.html");
      const overview = Dreadsylvania.parseOverview(log);
      expect(overview.village.remaining).toBe(1000);
    });
  });

  describe("capacitor", () => {
    test("detects fixed capacitor", () => {
      const { overview } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
      expect(overview.capacitor).toBe(true);
    });

    test.skip("false when not fixed", () => {
      // Needs a fixture with no fixed capacitor (none of ours have this)
      const overview = Dreadsylvania.parseOverview(
        loadDreadFixture("no-capacitor.html"),
      );
      expect(overview.capacitor).toBe(false);
    });
  });

  describe("skills", () => {
    test("3 remaining when none used", () => {
      const { overview } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
      expect(overview.remainingSkills).toBe(3);
    });

    test("0 remaining when all 3 used", () => {
      const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
      expect(overview.remainingSkills).toBe(0);
    });

    test("partial usage", async () => {
      const log = await loadFixture(import.meta.dirname, "raidlog.html");
      const overview = Dreadsylvania.parseOverview(log);
      expect(overview.remainingSkills).toBe(2);
    });
  });
});

describe("boss detection", () => {
  test("no bosses defeated in active dungeon", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
    expect(overview.forest.boss.status).not.toBe("defeated");
    expect(overview.village.boss.status).not.toBe("defeated");
    expect(overview.castle.boss.status).not.toBe("defeated");
  });

  test("detects Falls-From-Sky", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
    expect(overview.forest.boss).toMatchObject({ name: "Falls-From-Sky", status: "defeated" });
  });

  test("detects Great Wolf of the Air", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(overview.forest.boss).toMatchObject({ name: "The Great Wolf of the Air", status: "defeated" });
  });

  test("detects Zombie Homeowners' Association", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
    expect(overview.village.boss).toMatchObject({ name: "The Zombie Homeowners' Association", status: "defeated" });
  });

  test("detects Count Drunkula", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
    expect(overview.castle.boss).toMatchObject({ name: "Count Drunkula", status: "defeated" });
  });

  test("detects Unkillable Skeleton", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(overview.castle.boss).toMatchObject({ name: "The Unkillable Skeleton", status: "defeated" });
  });

  test("defeated bosses have confidence 1", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
    expect(overview.forest.boss.confidence).toBe(1);
  });

  test("predicts boss from kill differential", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const overview = Dreadsylvania.parseOverview(log);
    expect(overview.castle.boss).toMatchObject({ name: "The Unkillable Skeleton", status: "predicted" });
    expect(overview.castle.boss.confidence).toBeGreaterThan(0.5);
  });

  test("detects Mayor Ghost", () => {
    const { overview } = Dreadsylvania.parse(loadDreadFixture("raid-217988.html"));
    expect(overview.village.boss).toMatchObject({ name: "Mayor Ghost", status: "defeated" });
  });

  test("low-confidence prediction with few balanced kills", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const overview = Dreadsylvania.parseOverview(log);
    expect(overview.forest.boss.status).toBe("predicted");
    // 14 bugbear vs 11 werewolf — between 0.5 and 1
    expect(overview.forest.boss.confidence).toBeGreaterThan(0.5);
    expect(overview.forest.boss.confidence).toBeLessThan(0.9);
  });

});

describe("forest details", () => {
  test("attic", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(forest.attic).toBe(true);
  });

  test("watchtower", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-217988.html"));
    expect(forest.watchtower).toBe(true);
  });

  test("auditor badge", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-218029.html"));
    expect(forest.auditor).toBe(true);
  });

  test("music box", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(forest.musicbox).toBe(true);
  });

  test("kiwi via 'knocked some fruit loose'", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-218029.html"));
    expect(forest.kiwi).toBe(true);
  });

  test("kiwi via 'wasted some fruit'", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-213013.html"));
    expect(forest.kiwi).toBe(true);
  });

  test("moon-amber", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(forest.amber).toBe(true);
  });

  test("nothing unlocked", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
    expect(forest).toEqual({
      attic: false,
      watchtower: false,
      auditor: false,
      musicbox: false,
      kiwi: false,
      amber: false,
    });
  });

  test("everything unlocked", () => {
    const { forest } = Dreadsylvania.parse(loadDreadFixture("raid-217988.html"));
    expect(forest).toEqual({
      attic: true,
      watchtower: true,
      auditor: true,
      musicbox: true,
      kiwi: true,
      amber: true,
    });
  });
});

describe("village details", () => {
  test("schoolhouse", () => {
    const { village } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
    expect(village.schoolhouse).toBe(true);
  });

  test("master suite", () => {
    const { village } = Dreadsylvania.parse(loadDreadFixture("raid-218519.html"));
    expect(village.suite).toBe(true);
  });

  test("hanging via 'hung'", () => {
    const { village } = Dreadsylvania.parse(loadDreadFixture("raid-218205.html"));
    expect(village.hanging).toBe(true);
  });

  test("only schoolhouse unlocked", () => {
    const { village } = Dreadsylvania.parse(loadDreadFixture("cdr2-current.html"));
    expect(village).toEqual({
      schoolhouse: true,
      suite: false,
      hanging: false,
    });
  });

  test("everything unlocked", () => {
    const { village } = Dreadsylvania.parse(loadDreadFixture("raid-217988.html"));
    expect(village).toEqual({
      schoolhouse: true,
      suite: true,
      hanging: true,
    });
  });
});

describe("castle details", () => {
  test("lab", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
    expect(castle.lab).toBe(true);
  });

  test("roast beast", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(castle.roast).toBe(true);
  });

  test("wax banana", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("raid-218286.html"));
    expect(castle.banana).toBe(true);
  });

  test("stinking agaricus", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("raid-218029.html"));
    expect(castle.agaricus).toBe(true);
  });

  test("nothing unlocked except lab", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("cdr1-current.html"));
    expect(castle).toEqual({
      lab: true,
      roast: false,
      banana: false,
      agaricus: false,
    });
  });

  test("everything unlocked", () => {
    const { castle } = Dreadsylvania.parse(loadDreadFixture("raid-217988.html"));
    expect(castle).toEqual({
      lab: true,
      roast: true,
      banana: true,
      agaricus: true,
    });
  });
});

describe("participation", () => {
  test("parses kills per player", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const participation = Dreadsylvania.parseParticipation(log);
    // MeatballMarinaraMaster has the most Dread kills in the legacy fixture
    expect(participation[2802400]).toHaveProperty("kills", 423);
  });

  test("parses skill uses", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const participation = Dreadsylvania.parseParticipation(log);
    expect(participation[3137318]).toHaveProperty("skills", 1);
  });

  test("player with only skill use has 0 kills", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const participation = Dreadsylvania.parseParticipation(log);
    expect(participation[3137318]).toHaveProperty("kills", 0);
  });

  test("counts single kills, multi-kills, and boss kills", () => {
    // raid-218518: 2987 multi + 13 single + 3 boss = 3003
    const log = loadDreadFixture("raid-218518.html");
    const participation = Dreadsylvania.parseParticipation(log);
    const totalKills = Object.values(participation).reduce(
      (sum, { kills }) => sum + kills,
      0,
    );
    expect(totalKills).toBe(3003);
  });

  test("only counts Dread kills from combined page", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const participation = Dreadsylvania.parseParticipation(log);
    const totalKills = Object.values(participation).reduce(
      (sum, { kills }) => sum + kills,
      0,
    );
    expect(totalKills).toBe(511);
  });

  test("returns empty for non-Dread log", () => {
    const result = Dreadsylvania.parseParticipation("<html><body>No raids here</body></html>");
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("mergeParticipation accumulates same player across sources", () => {
    const merged = Dreadsylvania.mergeParticipation(
      { 123: { playerId: 123, kills: 10, skills: 0 } },
      { 123: { playerId: 123, kills: 5, skills: 1 } },
    );
    expect(merged[123]).toEqual({ playerId: 123, kills: 15, skills: 1 });
  });
});

describe("predictBoss", () => {
  const MONSTERS = ["bugbear", "werewolf"] as const;
  function kills(monster: 0 | 1, count: number): DreadEvent {
    return { type: "kill", playerName: "Test", playerId: 1, monster: MONSTERS[monster], count, boss: false };
  }
  function banish(monster: 0 | 1): DreadEvent {
    return { type: "banish", playerName: "Test", playerId: 1, monster: MONSTERS[monster] };
  }

  test("no information gives 50/50 confidence", () => {
    const prediction = Dreadsylvania.predictBoss("forest", []);
    expect(prediction.confidence).toBeCloseTo(0.5);
  });

  test("one banish on m1 predicts m2 boss", () => {
    const prediction = Dreadsylvania.predictBoss("forest", [banish(0)]);
    // H1(3:2) → bugbear=2, werewolf=2 (equal, random)
    // H2(2:3) → bugbear=1, werewolf=3 (werewolf boss)
    // Weighted: favours werewolf
    expect(prediction.boss).toBe("werewolf");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  test("two banishes on m1 strongly predicts m2 boss", () => {
    const prediction = Dreadsylvania.predictBoss("forest", [banish(0), banish(0)]);
    // H1: bugbear=1, werewolf=2 → werewolf boss
    // H2: bugbear=0, werewolf=3 → werewolf boss
    // Both hypotheses agree → confidence ~1.0
    expect(prediction.boss).toBe("werewolf");
    expect(prediction.confidence).toBeCloseTo(1.0);
  });

  test("equal banishes on both types gives 50/50", () => {
    const prediction = Dreadsylvania.predictBoss("forest", [banish(0), banish(1)]);
    expect(prediction.confidence).toBeCloseTo(0.5);
  });

  test("kill ratio provides evidence with no banishes", () => {
    const prediction = Dreadsylvania.predictBoss("forest", [
      kills(0, 300),
      kills(1, 200),
    ]);
    // More bugbear kills → bugbear is more prevalent → bugbear boss
    expect(prediction.boss).toBe("bugbear");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  test("more kills increase confidence", () => {
    const few = Dreadsylvania.predictBoss("forest", [kills(0, 6), kills(1, 4)]);
    const many = Dreadsylvania.predictBoss("forest", [kills(0, 600), kills(1, 400)]);
    expect(few.boss).toBe(many.boss);
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  test("banish and kills reinforce each other", () => {
    const banishOnly = Dreadsylvania.predictBoss("forest", [banish(0)]);
    const both = Dreadsylvania.predictBoss("forest", [
      kills(0, 100),
      banish(0),
      kills(1, 200),
    ]);
    // Both should predict werewolf, combined signal stronger
    expect(banishOnly.boss).toBe("werewolf");
    expect(both.boss).toBe("werewolf");
    expect(both.confidence).toBeGreaterThan(banishOnly.confidence);
  });

  test("kills after a banish equalises ratio are less informative", () => {
    // Banish m1 once: H1 → 2:2 (50/50), H2 → 1:3 (25/75)
    // Post-banish kills at 50/50 still distinguish H1 from H2
    const prediction = Dreadsylvania.predictBoss("forest", [
      banish(0),
      kills(0, 50),
      kills(1, 50),
    ]);
    // Equal post-banish kills: under H1 this is expected (50/50),
    // under H2 we'd expect 25/75 — so equal kills favour H1
    // H1 → equal weights → unknown boss, H2 → werewolf boss
    // Evidence favours H1 → prediction leans toward 50/50 → lower confidence
    expect(prediction.confidence).toBeLessThan(0.75);
  });

  test("kills before banish use pre-banish ratio", () => {
    // Pre-banish kills at 60/40 then banish m1
    const prediction = Dreadsylvania.predictBoss("forest", [
      kills(0, 300),
      kills(1, 200),
      banish(0),
    ]);
    // Pre-banish kills favour m1=3 (H1). After banish:
    // H1 → 2:2 (unknown), H2 → 1:3 (werewolf)
    // Evidence from kills strongly favours H1 → prediction is uncertain
    // because H1's final state is equal weights
    expect(prediction.boss).toBe("bugbear");
  });

  test("works for village zone", () => {
    const ghostBanish: DreadEvent = { type: "banish", playerName: "Test", playerId: 1, monster: "ghost" };
    const prediction = Dreadsylvania.predictBoss("village", [ghostBanish]);
    expect(prediction.boss).toBe("zombie");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });

  test("works for castle zone", () => {
    const vKills: DreadEvent = { type: "kill", playerName: "Test", playerId: 1, monster: "vampire", count: 100, boss: false };
    const sKills: DreadEvent = { type: "kill", playerName: "Test", playerId: 1, monster: "skeleton", count: 300, boss: false };
    const prediction = Dreadsylvania.predictBoss("castle", [vKills, sKills]);
    expect(prediction.boss).toBe("skeleton");
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });
});
