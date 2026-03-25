import { describe, expect, test } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { loadFixture } from "../testUtils.js";
import { DreadsylvaniaRaid, type DreadEvent } from "./Dreadsylvania.js";

function loadDreadFixture(name: string): string {
  return readFileSync(
    join(import.meta.dirname, "__fixtures__", "dread", name),
    "utf8",
  );
}

function dread(name: string): DreadsylvaniaRaid {
  return new DreadsylvaniaRaid(loadDreadFixture(name));
}

describe("overview", () => {
  describe("remaining monsters", () => {
    test("in-progress dungeon", () => {
      const overview = dread("cdr1-current.html").getOverview();
      expect(overview.forest.remaining).toBe(493);
      expect(overview.village.remaining).toBe(509);
      expect(overview.castle.remaining).toBe(661);
    });

    test("completed dungeon has 0 remaining", () => {
      const overview = dread("raid-218519.html").getOverview();
      expect(overview.forest.remaining).toBe(0);
      expect(overview.village.remaining).toBe(0);
      expect(overview.castle.remaining).toBe(0);
    });

    test("zone with no kills has 1000 remaining", async () => {
      const log = await loadFixture(import.meta.dirname, "raidlog.html");
      expect(new DreadsylvaniaRaid(log).getOverview().village.remaining).toBe(1000);
    });
  });

  describe("capacitor", () => {
    test("detects fixed capacitor", () => {
      expect(dread("cdr1-current.html").getOverview().capacitor).toBe(true);
    });

    test.skip("false when not fixed", () => {
      // Needs a fixture with no fixed capacitor (none of ours have this)
      expect(
        new DreadsylvaniaRaid(loadDreadFixture("no-capacitor.html")).getOverview().capacitor,
      ).toBe(false);
    });
  });

  describe("skills", () => {
    test("3 remaining when none used", () => {
      expect(dread("cdr1-current.html").getOverview().remainingSkills).toBe(3);
    });

    test("0 remaining when all 3 used", () => {
      expect(dread("raid-218286.html").getOverview().remainingSkills).toBe(0);
    });

    test("partial usage", async () => {
      const log = await loadFixture(import.meta.dirname, "raidlog.html");
      expect(new DreadsylvaniaRaid(log).getOverview().remainingSkills).toBe(2);
    });
  });
});

describe("boss detection", () => {
  test("no bosses defeated in active dungeon", () => {
    const overview = dread("cdr1-current.html").getOverview();
    expect(overview.forest.boss.status).not.toBe("defeated");
    expect(overview.village.boss.status).not.toBe("defeated");
    expect(overview.castle.boss.status).not.toBe("defeated");
  });

  test("detects Falls-From-Sky", () => {
    expect(dread("raid-218519.html").getBossStatus("forest"))
      .toMatchObject({ name: "Falls-From-Sky", status: "defeated" });
  });

  test("detects The Great Wolf of the Air", () => {
    expect(dread("raid-218286.html").getBossStatus("forest"))
      .toMatchObject({ name: "The Great Wolf of the Air", status: "defeated" });
  });

  test("detects The Zombie Homeowners' Association", () => {
    expect(dread("raid-218519.html").getBossStatus("village"))
      .toMatchObject({ name: "The Zombie Homeowners' Association", status: "defeated" });
  });

  test("detects Count Drunkula", () => {
    expect(dread("raid-218519.html").getBossStatus("castle"))
      .toMatchObject({ name: "Count Drunkula", status: "defeated" });
  });

  test("detects The Unkillable Skeleton", () => {
    expect(dread("raid-218286.html").getBossStatus("castle"))
      .toMatchObject({ name: "The Unkillable Skeleton", status: "defeated" });
  });

  test("defeated bosses have confidence 1", () => {
    expect(dread("raid-218519.html").getBossStatus("forest").confidence).toBe(1);
  });

  test("predicts boss from kill differential", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const boss = new DreadsylvaniaRaid(log).getBossStatus("castle");
    expect(boss).toMatchObject({ name: "The Unkillable Skeleton", status: "predicted" });
    expect(boss.confidence).toBeGreaterThan(0.5);
  });

  test("detects Mayor Ghost", () => {
    expect(dread("raid-217988.html").getBossStatus("village"))
      .toMatchObject({ name: "Mayor Ghost", status: "defeated" });
  });

  test("low-confidence prediction with few balanced kills", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const boss = new DreadsylvaniaRaid(log).getBossStatus("forest");
    expect(boss.status).toBe("predicted");
    expect(boss.confidence).toBeGreaterThan(0.5);
    expect(boss.confidence).toBeLessThan(0.9);
  });
});

describe("forest details", () => {
  test("attic", () => expect(dread("raid-218286.html").getForestStatus().attic).toBe(true));
  test("watchtower", () => expect(dread("raid-217988.html").getForestStatus().watchtower).toBe(true));
  test("auditor badge", () => expect(dread("raid-218029.html").getForestStatus().auditor).toBe(true));
  test("music box", () => expect(dread("raid-218286.html").getForestStatus().musicbox).toBe(true));
  test("kiwi via 'knocked some fruit loose'", () => expect(dread("raid-218029.html").getForestStatus().kiwi).toBe(true));
  test("kiwi via 'wasted some fruit'", () => expect(dread("raid-213013.html").getForestStatus().kiwi).toBe(true));
  test("moon-amber", () => expect(dread("raid-218286.html").getForestStatus().amber).toBe(true));

  test("nothing unlocked", () => {
    expect(dread("cdr1-current.html").getForestStatus()).toEqual({
      attic: false, watchtower: false, auditor: false,
      musicbox: false, kiwi: false, amber: false,
    });
  });

  test("everything unlocked", () => {
    expect(dread("raid-217988.html").getForestStatus()).toEqual({
      attic: true, watchtower: true, auditor: true,
      musicbox: true, kiwi: true, amber: true,
    });
  });
});

describe("village details", () => {
  test("schoolhouse", () => expect(dread("cdr1-current.html").getVillageStatus().schoolhouse).toBe(true));
  test("master suite", () => expect(dread("raid-218519.html").getVillageStatus().suite).toBe(true));
  test("hanging via 'hung'", () => expect(dread("raid-218205.html").getVillageStatus().hanging).toBe(true));

  test("only schoolhouse unlocked", () => {
    expect(dread("cdr2-current.html").getVillageStatus()).toEqual({
      schoolhouse: true, suite: false, hanging: false,
    });
  });

  test("everything unlocked", () => {
    expect(dread("raid-217988.html").getVillageStatus()).toEqual({
      schoolhouse: true, suite: true, hanging: true,
    });
  });
});

describe("castle details", () => {
  test("lab", () => expect(dread("cdr1-current.html").getCastleStatus().lab).toBe(true));
  test("roast beast", () => expect(dread("raid-218286.html").getCastleStatus().roast).toBe(true));
  test("wax banana", () => expect(dread("raid-218286.html").getCastleStatus().banana).toBe(true));
  test("stinking agaricus", () => expect(dread("raid-218029.html").getCastleStatus().agaricus).toBe(true));

  test("nothing unlocked except lab", () => {
    expect(dread("cdr1-current.html").getCastleStatus()).toEqual({
      lab: true, roast: false, banana: false, agaricus: false,
    });
  });

  test("everything unlocked", () => {
    expect(dread("raid-217988.html").getCastleStatus()).toEqual({
      lab: true, roast: true, banana: true, agaricus: true,
    });
  });
});

describe("participation", () => {
  test("parses kills per player", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    expect(new DreadsylvaniaRaid(log).getParticipation()[2802400]).toHaveProperty("kills", 423);
  });

  test("parses skill uses", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    expect(new DreadsylvaniaRaid(log).getParticipation()[3137318]).toHaveProperty("skills", 1);
  });

  test("player with only skill use has 0 kills", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    expect(new DreadsylvaniaRaid(log).getParticipation()[3137318]).toHaveProperty("kills", 0);
  });

  test("counts single kills, multi-kills, and boss kills", () => {
    const totalKills = Object.values(dread("raid-218518.html").getParticipation())
      .reduce((sum, { kills }) => sum + kills, 0);
    expect(totalKills).toBe(3003);
  });

  test("only counts Dread kills from combined page", async () => {
    const log = await loadFixture(import.meta.dirname, "raidlog.html");
    const totalKills = Object.values(new DreadsylvaniaRaid(log).getParticipation())
      .reduce((sum, { kills }) => sum + kills, 0);
    expect(totalKills).toBe(511);
  });

  test("returns empty for non-Dread log", () => {
    expect(Object.keys(new DreadsylvaniaRaid("<html>Not a raid</html>").getParticipation()))
      .toHaveLength(0);
  });

  test("mergeParticipation accumulates same player across sources", () => {
    const merged = DreadsylvaniaRaid.mergeParticipation(
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
  function predict(events: DreadEvent[]) {
    const raid = new DreadsylvaniaRaid("");
    (raid as { events: DreadEvent[] }).events = events;
    return raid.predictBoss("forest");
  }

  test("no information gives 50/50 confidence", () => {
    expect(predict([]).confidence).toBeCloseTo(0.5);
  });

  test("one banish on m1 predicts m2 boss", () => {
    const p = predict([banish(0)]);
    expect(p.boss).toBe("werewolf");
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  test("two banishes on m1 strongly predicts m2 boss", () => {
    const p = predict([banish(0), banish(0)]);
    expect(p.boss).toBe("werewolf");
    expect(p.confidence).toBeCloseTo(1.0);
  });

  test("equal banishes on both types gives 50/50", () => {
    expect(predict([banish(0), banish(1)]).confidence).toBeCloseTo(0.5);
  });

  test("kill ratio provides evidence with no banishes", () => {
    const p = predict([kills(0, 300), kills(1, 200)]);
    expect(p.boss).toBe("bugbear");
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  test("more kills increase confidence", () => {
    const few = predict([kills(0, 6), kills(1, 4)]);
    const many = predict([kills(0, 600), kills(1, 400)]);
    expect(few.boss).toBe(many.boss);
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });

  test("banish and kills reinforce each other", () => {
    const banishOnly = predict([banish(0)]);
    const both = predict([kills(0, 100), banish(0), kills(1, 200)]);
    expect(banishOnly.boss).toBe("werewolf");
    expect(both.boss).toBe("werewolf");
    expect(both.confidence).toBeGreaterThan(banishOnly.confidence);
  });

  test("kills after a banish equalises ratio are less informative", () => {
    expect(predict([banish(0), kills(0, 50), kills(1, 50)]).confidence).toBeLessThan(0.75);
  });

  test("kills before banish use pre-banish ratio", () => {
    expect(predict([kills(0, 300), kills(1, 200), banish(0)]).boss).toBe("bugbear");
  });

  test("works for village zone", () => {
    const raid = new DreadsylvaniaRaid("");
    (raid as { events: DreadEvent[] }).events = [
      { type: "banish", playerName: "Test", playerId: 1, monster: "ghost" },
    ];
    const p = raid.predictBoss("village");
    expect(p.boss).toBe("zombie");
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  test("works for castle zone", () => {
    const raid = new DreadsylvaniaRaid("");
    (raid as { events: DreadEvent[] }).events = [
      { type: "kill", playerName: "Test", playerId: 1, monster: "vampire", count: 100, boss: false },
      { type: "kill", playerName: "Test", playerId: 1, monster: "skeleton", count: 300, boss: false },
    ];
    const p = raid.predictBoss("castle");
    expect(p.boss).toBe("skeleton");
    expect(p.confidence).toBeGreaterThan(0.5);
  });
});
