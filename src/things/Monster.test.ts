import { dedent } from "ts-dedent";
import { describe, expect, test } from "vitest";

import { Effect } from "./Effect.js";
import { Monster } from "./Monster.js";

describe("Monster description", () => {
  test("Monsters with copied drops are described successfully", async () => {
    const monster = Monster.from(
      "drunken rat king	996	ratking.gif	NOCOPY Atk: 40 Def: 36 HP: 32 Init: 100 Meat: 40 P: beast EA: sleaze Article: a	rat whisker (100)	rat whisker (100)	rat whisker (100)	rat whisker (100)	rat appendix (20)	rat appendix (20)	rat appendix (20)	tangle of rat tails (100)"
    );
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 996)
        Attack: 40 | Defense: 36 | HP: 32
        Phylum: beast
        Can't be copied.

        Drops:
        40 (±8) meat
        4x [rat whisker](https://kol.coldfront.net/thekolwiki/index.php/rat_whisker) (100%)
        [tangle of rat tails](https://kol.coldfront.net/thekolwiki/index.php/tangle_of_rat_tails) (100%)
        3x [rat appendix](https://kol.coldfront.net/thekolwiki/index.php/rat_appendix) (20%)
      `
    );
  });

  test("Monsters with capped scaling are described successfully", async () => {
    const monster = Monster.from(
      "Gurgle the Turgle	1768	animturtle.gif	NOBANISH Scale: [5+20*pref(dinseyAudienceEngagement)] Cap: 11111 Floor: 100 MLMult: [3+2*pref(dinseyAudienceEngagement)] Init: -10000 P: construct E: stench	turtle voicebox (0)	fake washboard (c0)"
    );
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1768)
        Scales to something weird (min 100, max 11111) | HP: 75% of defense.
        Phylum: construct
        Element: stench
        Always loses initiative.

        Drops:
        [turtle voicebox](https://kol.coldfront.net/thekolwiki/index.php/turtle_voicebox) (Sometimes)
        [fake washboard](https://kol.coldfront.net/thekolwiki/index.php/fake_washboard) (Sometimes, conditional)
      `
    );
  });

  test("Monsters with normal scaling are described successfully", async () => {
    const monster = Monster.from(
      "clan of cave bars	1162	cavebars.gif	NOCOPY Scale: 20 Cap: 200 Floor: 30 MLMult: 5 Init: -10000 Meat: 400 Group: 10 P: beast Article: a"
    );
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 1162)
        Scales to your stats plus 20 (min 30, max 200) | HP: 75% of defense.
        Phylum: beast
        Always loses initiative.
        Can't be copied.

        Drops:
        400 (±80) meat
      `
    );
  });

  test("Monsters who scale unusally are described successfully", async () => {
    const monster = Monster.from(
      "Count Drunkula (Hard Mode)	-89	drunkula_hm.gif	NOCOPY NOMANUEL P: undead	Thunkula's drinking cap (c0)	Drunkula's cape (c0)	Drunkula's silky pants (c0)	Drunkula's ring of haze (c0)	Drunkula's wineglass (c0)"
    );
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster -89)
        Scales unusually.
        Phylum: undead
        Can't be copied.

        Drops:
        [Thunkula's drinking cap](https://kol.coldfront.net/thekolwiki/index.php/Thunkula's_drinking_cap) (Sometimes, conditional)
        [Drunkula's cape](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_cape) (Sometimes, conditional)
        [Drunkula's silky pants](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_silky_pants) (Sometimes, conditional)
        [Drunkula's ring of haze](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_ring_of_haze) (Sometimes, conditional)
        [Drunkula's wineglass](https://kol.coldfront.net/thekolwiki/index.php/Drunkula's_wineglass) (Sometimes, conditional)
      `
    );
  });

  test("Monsters with a stealable accordion are described successfully", async () => {
    const monster = Monster.from(
      "bar	202	bar.gif	Atk: 3 Def: 2 HP: 5 Init: 50 Meat: 15 P: beast Article: a	bar skin (35)	baritone accordion (a0)"
    );
    const description = await monster.getDescription();

    expect(description).toBe(
      dedent`
        **Monster**
        (Monster 202)
        Attack: 3 | Defense: 2 | HP: 5
        Phylum: beast

        Drops:
        15 (±3) meat
        [bar skin](https://kol.coldfront.net/thekolwiki/index.php/bar_skin) (35%)
        [baritone accordion](https://kol.coldfront.net/thekolwiki/index.php/baritone_accordion) (Stealable accordion)
      `
    );
  });
});

describe("Hashcodes", () => {
  test("Can create a reliable hashcode for Monsters", () => {
    const line =
      "bar	202	bar.gif	Atk: 3 Def: 2 HP: 5 Init: 50 Meat: 15 P: beast Article: a	bar skin (35)	baritone accordion (a0)";
    const a = Monster.from(line);
    const b = Monster.from(line);

    expect(a.hashcode()).toBe("Monster:202");
    expect(a.hashcode()).toEqual(b.hashcode());
  });

  test("Compares by thing type", () => {
    const a = Monster.from(
      "bar	202	bar.gif	Atk: 3 Def: 2 HP: 5 Init: 50 Meat: 15 P: beast Article: a	bar skin (35)	baritone accordion (a0)"
    );
    const b = Effect.from(
      "202	Pasta Oneness	mandala.gif	583619abc0e4380d80629babe3677aed	good	none	cast 1 Manicotti Meditation"
    );

    expect(a.hashcode()).not.toEqual(b.hashcode());
  });
});
