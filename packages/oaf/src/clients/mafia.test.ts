import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadFixture } from "../testUtils.js";
import { Effect } from "../things/Effect.js";
import { Monster } from "../things/Monster.js";
import { Skill } from "../things/Skill.js";
import { mafiaClient } from "./mafia.js";

global.fetch = vi.fn();

const text = vi.fn();

describe("Wiki links", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
      text,
      ok: true,
      status: 200,
    } as unknown as Response);
  });

  test("Can get wiki link for an effect under id 100", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "effects_by_number_1-99.html"),
    );

    const effect = new Effect({
      id: 23,
      image: "mandala.gif",
      name: "Pasta Oneness",
      quality: "GOOD",
      nohookah: false,
      descid: "583619abc0e4380d80629babe3677aed",
      effectModifierByEffect: {
        modifiers: {
          Mysticality: "+2",
        },
      },
    });

    await mafiaClient.getWikiLink(effect);

    expect(fetch).toHaveBeenCalledWith(
      "https://wiki.kingdomofloathing.com/Effects_by_number_(1-99)",
    );
  });

  test("Can get wiki link for an effect over id 100", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "effects_by_number_100-199.html"),
    );

    const effect = new Effect({
      id: 127,
      image: "gothy.gif",
      name: "Gothy",
      quality: "NEUTRAL",
      nohookah: false,
      descid: "06cb86ddd689278c5af31423a8210a72",
      effectModifierByEffect: {
        modifiers: {
          Moxie: "-10",
          Muscle: "-10",
          Mysticality: "+20",
        },
      },
    });
    const link = await mafiaClient.getWikiLink(effect);

    expect(fetch).toHaveBeenCalledWith(
      "https://wiki.kingdomofloathing.com/Effects_by_number_(100-199)",
    );
    expect(link).toBe("https://wiki.kingdomofloathing.com/Gothy");
  });

  test("Can get wiki link for a skill", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "skills_by_number.html"),
    );

    const skill = new Skill({
      name: "Impetuous Sauciness",
      id: 4015,
      image: "5alarm.gif",
    });
    const link = await mafiaClient.getWikiLink(skill);

    expect(fetch).toHaveBeenCalledWith(
      "https://wiki.kingdomofloathing.com/Skills_by_number",
    );
    expect(link).toBe("https://wiki.kingdomofloathing.com/Impetuous_Sauciness");
  });

  test("Can get wiki link for a monster", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "monsters_by_number_1400-1499.html"),
    );

    const monster = new Monster({
      id: 1454,
      image: ["wanderacc3.gif"],
      name: "quirky indie-rock accordionist",
    });
    const link = await mafiaClient.getWikiLink(monster);

    expect(fetch).toHaveBeenCalledWith(
      "https://wiki.kingdomofloathing.com/Monsters_by_number_(1400-1499)",
    );
    expect(link).toBe(
      "https://wiki.kingdomofloathing.com/Quirky_indie-rock_accordionist",
    );
  });
});
