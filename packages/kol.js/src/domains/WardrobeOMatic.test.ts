import { describe, expect, it } from "vitest";

import { WardrobeOMatic } from "./WardrobeOMatic.js";

describe("WardrobeOMatic", () => {
  // Gameday 8436 = March 17 2026, player levels 1-4 (wardrobe level 0)
  describe("gameday 8436, player level 1", () => {
    it("generates the correct shirt", () => {
      const shirt = WardrobeOMatic.getWardrobe(8436, 1, "shirt");
      expect(shirt.name).toBe("conductive hyperwool dress shirt");
      expect(shirt.image).toBe(8);
      expect(shirt.modifiers).toHaveLength(1);
      expect(shirt.modifiers[0]).toMatchObject({
        id: "maximumHp",
        description: "Maximum HP +14",
      });
    });

    it("generates the correct hat", () => {
      const hat = WardrobeOMatic.getWardrobe(8436, 1, "hat");
      expect(hat.name).toBe("laser-guided yttrium-silver ultratiara");
      expect(hat.image).toBe(4);
      expect(hat.modifiers).toHaveLength(1);
      expect(hat.modifiers[0]).toMatchObject({
        id: "spellDamageSpooky",
        description: "+5 Damage to Spooky Spells",
      });
    });

    it("generates the correct familiar equipment", () => {
      const famEquip = WardrobeOMatic.getWardrobe(
        8436,
        1,
        "familiar-equipment",
      );
      expect(famEquip.name).toBe(
        "partially transparent pink-black pet sweater",
      );
      expect(famEquip.image).toBe(7);
      expect(famEquip.modifiers).toHaveLength(1);
      expect(famEquip.modifiers[0]).toMatchObject({
        id: "familiarWeight",
        description: "+5 to Familiar Weight",
      });
    });

    it("produces the same results for player levels 1-4", () => {
      const level1 = WardrobeOMatic.getWardrobe(8436, 1);
      for (const pl of [2, 3, 4]) {
        const result = WardrobeOMatic.getWardrobe(8436, pl);
        expect(result).toEqual(level1);
      }
    });
  });

  // Gameday 8420 = March 1 2026, player levels 10-14 (wardrobe level 2)
  describe("gameday 8420, player level 10", () => {
    it("generates the correct shirt", () => {
      const shirt = WardrobeOMatic.getWardrobe(8420, 10, "shirt");
      expect(shirt.name).toBe("carbon-coated wax paper jersey");
      expect(shirt.image).toBe(7);
      expect(shirt.modifiers).toHaveLength(3);
      expect(shirt.modifiers).toContainEqual(
        expect.objectContaining({
          id: "mysticality",
          description: "Mysticality +32",
        }),
      );
      expect(shirt.modifiers).toContainEqual(
        expect.objectContaining({
          id: "resistanceStench",
          description: "Stupendous Stench Resistance (+4)",
        }),
      );
      expect(shirt.modifiers).toContainEqual(
        expect.objectContaining({
          id: "maximumHp",
          description: "Maximum HP +68",
        }),
      );
    });

    it("generates the correct hat", () => {
      const hat = WardrobeOMatic.getWardrobe(8420, 10, "hat");
      expect(hat.name).toBe("psionic cobalt-iridium astro-trilby");
      expect(hat.image).toBe(1);
      expect(hat.modifiers).toHaveLength(3);
      expect(hat.modifiers).toContainEqual(
        expect.objectContaining({
          id: "spellDamageSpooky",
          description: "+18 Damage to Spooky Spells",
        }),
      );
      expect(hat.modifiers).toContainEqual(
        expect.objectContaining({
          id: "moxie",
          description: "Moxie +32",
        }),
      );
      expect(hat.modifiers).toContainEqual(
        expect.objectContaining({
          id: "damageSpooky",
          description: "+18 Spooky Damage",
        }),
      );
    });

    it("generates the correct familiar equipment", () => {
      const famEquip = WardrobeOMatic.getWardrobe(
        8420,
        10,
        "familiar-equipment",
      );
      expect(famEquip.name).toBe("prismatic amber-cornflower collar");
      expect(famEquip.image).toBe(4);
      expect(famEquip.modifiers).toHaveLength(1);
      expect(famEquip.modifiers[0]).toMatchObject({
        id: "familiarWeight",
        description: "+11 to Familiar Weight",
      });
    });

    it("produces the same results for player levels 10-14", () => {
      const level10 = WardrobeOMatic.getWardrobe(8420, 10);
      for (const pl of [11, 12, 13, 14]) {
        const result = WardrobeOMatic.getWardrobe(8420, pl);
        expect(result).toEqual(level10);
      }
    });
  });

  describe("overloads", () => {
    it("returns all 3 slots when no slot specified", () => {
      const items = WardrobeOMatic.getWardrobe(8436, 1);
      expect(items).toHaveLength(3);
      expect(items[0].slot).toBe("shirt");
      expect(items[1].slot).toBe("hat");
      expect(items[2].slot).toBe("familiar-equipment");
    });
  });
});
