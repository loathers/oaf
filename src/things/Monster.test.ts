import dedent from "ts-dedent";

import { Monster } from "./Monster";

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

test("Monsters with normal scaling are describes successfully", async () => {
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
