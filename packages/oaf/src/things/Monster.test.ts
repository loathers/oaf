import { Effect as DolEffect, Monster as DolMonster } from "data-of-loathing";
import { beforeAll, describe, expect, test } from "vitest";

import { testDb } from "../__fixtures__/testDb.js";
import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

async function loadMonster(id: number): Promise<Monster> {
  const client = await testDb;
  const dolMonster = await client.query.findOne(
    DolMonster,
    { id },
    { populate: ["drops.item"] },
  );
  return new Monster(dolMonster!);
}

let ratKing: Monster;
let gurgle: Monster;
let caveBars: Monster;
let drunkula: Monster;
let bar: Monster;

beforeAll(async () => {
  [ratKing, gurgle, caveBars, drunkula, bar] = await Promise.all([
    loadMonster(996),
    loadMonster(1768),
    loadMonster(1162),
    loadMonster(-89),
    loadMonster(202),
  ]);
});

describe("Monster description", () => {
  test("Monsters with copied drops are described successfully", async () => {
    expect(await ratKing.getDescription()).toBe(
      [
        "**Monster**",
        "(Monster 996)",
        "Attack: 40 | Defense: 36 | HP: 32",
        "Phylum: beast \u{1F43A}",
        "Can't be copied.",
        "Instakill immune.",
        "",
        "Drops:",
        "40 (±8) meat",
        "2x [rat whisker](https://wiki.kingdomofloathing.com/rat_whisker) (100%)",
        "2x [rat whisker](https://wiki.kingdomofloathing.com/rat_whisker) (Sometimes)",
        "3x [rat appendix](https://wiki.kingdomofloathing.com/rat_appendix) (20%)",
        "[tangle of rat tails](https://wiki.kingdomofloathing.com/tangle_of_rat_tails) (100%)",
      ].join("\n"),
    );
  });

  test("Monsters with capped scaling are described successfully", async () => {
    expect(await gurgle.getDescription()).toBe(
      [
        "**Monster**",
        "(Monster 1768)",
        "Scales to something weird (min 100, max 11111) | HP: 75% of defense.",
        "Phylum: construct \u{1F916}",
        "Element: stench 💨",
        "Always loses initiative.",
        "",
        "Drops:",
        "[turtle voicebox](https://wiki.kingdomofloathing.com/turtle_voicebox) (15%)",
        "[fake washboard](https://wiki.kingdomofloathing.com/fake_washboard) (0.1%, unaffected by item drop modifiers)",
      ].join("\n"),
    );
  });

  test("Monsters with normal scaling are described successfully", async () => {
    expect(await caveBars.getDescription()).toBe(
      [
        "**Monster**",
        "(Monster 1162)",
        "Scales to your stats plus 20 (min 30, max 200) | HP: 75% of defense.",
        "Phylum: beast \u{1F43A}",
        "Always loses initiative.",
        "Can't be copied.",
        "",
        "Drops:",
        "400 (±80) meat",
      ].join("\n"),
    );
  });

  test("Monsters who scale unusally are described successfully", async () => {
    expect(await drunkula.getDescription()).toBe(
      [
        "**Monster**",
        "(Monster -89)",
        "Scales unusually.",
        "Phylum: undead \u{1F9DF}",
        "Can't be copied.",
        "",
        "Drops:",
        "[Thunkula's drinking cap](https://wiki.kingdomofloathing.com/Thunkula's_drinking_cap) (100%, conditional)",
        "[Drunkula's cape](https://wiki.kingdomofloathing.com/Drunkula's_cape) (100%, conditional)",
        "[Drunkula's silky pants](https://wiki.kingdomofloathing.com/Drunkula's_silky_pants) (100%, conditional)",
        "[Drunkula's ring of haze](https://wiki.kingdomofloathing.com/Drunkula's_ring_of_haze) (100%, conditional)",
        "[Drunkula's wineglass](https://wiki.kingdomofloathing.com/Drunkula's_wineglass) (100%, conditional)",
        "[Drunkula's bell](https://wiki.kingdomofloathing.com/Drunkula's_bell) (100%, conditional)",
        "[skull capacitor](https://wiki.kingdomofloathing.com/skull_capacitor) (100%)",
      ].join("\n"),
    );
  });

  test("Monsters with a stealable accordion are described successfully", async () => {
    expect(await bar.getDescription()).toBe(
      [
        "**Monster**",
        "(Monster 202)",
        "Attack: 3 | Defense: 2 | HP: 5",
        "Phylum: beast \u{1F43A}",
        "",
        "Drops:",
        "15 (±3) meat",
        "[bar skin](https://wiki.kingdomofloathing.com/bar_skin) (35%)",
        "[baritone accordion](https://wiki.kingdomofloathing.com/baritone_accordion) (Stealable accordion)",
      ].join("\n"),
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Monsters", () => {
    expect(bar.hashcode()).toBe("Monster:202");
  });

  test("Compares by thing type", async () => {
    const client = await testDb;
    const dolEffect = await client.query.findOne(
      DolEffect,
      { id: 23 },
      { populate: ["modifiers"] },
    );
    const effect = new Effect(dolEffect!);
    expect(bar.hashcode()).not.toEqual(effect.hashcode());
  });
});
