import { type Response, fetch } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { loadFixture } from "../testUtils.js";
import { Effect } from "../things/Effect.js";
import { Monster } from "../things/Monster.js";
import { Skill } from "../things/Skill.js";
import { wikiClient } from "./wiki.js";

vi.mock("undici");

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

    const effect = Effect.from(
      "23	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation",
    );

    await wikiClient.getWikiLink(effect);

    expect(fetch).toHaveBeenCalledWith(
      "https://kol.coldfront.net/thekolwiki/index.php/Effects_by_number_(1-99)",
      expect.anything(),
    );
  });

  test("Can get wiki link for an effect over id 100", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "effects_by_number_100-199.html"),
    );

    const effect = Effect.from(
      "127	Gothy	gothy.gif	06cb86ddd689278c5af31423a8210a72	neutral	none	use either 1 spooky eyeliner, 1 spooky lipstick|drink 1 gloomy mushroom wine",
    );
    const link = await wikiClient.getWikiLink(effect);

    expect(fetch).toHaveBeenCalledWith(
      "https://kol.coldfront.net/thekolwiki/index.php/Effects_by_number_(100-199)",
      expect.anything(),
    );
    expect(link).toBe("https://kol.coldfront.net/thekolwiki/index.php/Gothy");
  });

  test("Can get wiki link for a skill", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "skills_by_number.html"),
    );

    const skill = Skill.from("4015	Impetuous Sauciness	5alarm.gif	0	0	0	12");
    const link = await wikiClient.getWikiLink(skill);

    expect(fetch).toHaveBeenCalledWith(
      "https://kol.coldfront.net/thekolwiki/index.php/Skills_by_number",
      expect.anything(),
    );
    expect(link).toBe(
      "https://kol.coldfront.net/thekolwiki/index.php/Impetuous_Sauciness",
    );
  });

  test("Can get wiki link for a monster", async () => {
    text.mockResolvedValueOnce(
      await loadFixture(__dirname, "monsters_by_number_1400-1499.html"),
    );

    const monster = Monster.from(
      "quirky indie-rock accordionist	1454	wanderacc3.gif	FREE WANDERER Scale: -3 Floor: ? Init: -10000 P: dude Article: a	quirky accordion (a100)",
    );
    const link = await wikiClient.getWikiLink(monster);

    expect(fetch).toHaveBeenCalledWith(
      "https://kol.coldfront.net/thekolwiki/index.php/Monsters_by_number_(1400-1499)",
      expect.anything(),
    );
    expect(link).toBe(
      "https://kol.coldfront.net/thekolwiki/index.php/Quirky_indie-rock_accordionist",
    );
  });
});
