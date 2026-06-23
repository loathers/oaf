import {
  Effect as DolEffect,
  Familiar as DolFamiliar,
  Item as DolItem,
  Monster as DolMonster,
  Skill as DolSkill,
  createClient,
} from "data-of-loathing";
import { EmbedBuilder } from "discord.js";
import { cleanString, toWikiLink } from "kol.js";

import {
  Effect,
  Familiar,
  Item,
  Monster,
  Skill,
  Thing,
} from "../things/index.js";
import { clearMemoized, memoize } from "../utils/memoize.js";
import { createEmbed } from "./discord.js";
import { pizzaTree } from "./pizza.js";
import { wikiClient } from "./wiki.js";

export class DataOfLoathingClient {
  #client = createClient();
  #loaded = false;

  get loaded() {
    return this.#loaded;
  }

  private itemByName: Map<string, Item> = new Map();
  private itemById: Map<number, Item> = new Map();
  private itemByDescId: Map<number, Item> = new Map();
  private skillByName: Map<string, Skill> = new Map();
  private effectByName: Map<string, Effect> = new Map();
  private familiarByName: Map<string, Familiar> = new Map();
  private monsterByName: Map<string, Monster> = new Map();
  private monsterById: Map<number, Monster> = new Map();

  private knownItemIds = new Set<number>();
  #lastItem = -1;
  #lastFamiliar = -1;
  #lastSkills: { [block: number]: number } = {};
  private lastDownloadTime = -1;

  get lastItem() {
    return this.#lastItem;
  }
  get lastFamiliar() {
    return this.#lastFamiliar;
  }
  get lastSkills() {
    return this.#lastSkills;
  }

  clearMaps() {
    this.itemByName.clear();
    this.itemById.clear();
    this.itemByDescId.clear();
    this.skillByName.clear();
    this.effectByName.clear();
    this.familiarByName.clear();
    this.monsterByName.clear();
    this.monsterById.clear();
  }

  getMapForThing(thing: Thing): Map<string, Thing> {
    if (thing instanceof Item) return this.itemByName;
    if (thing instanceof Skill) return this.skillByName;
    if (thing instanceof Effect) return this.effectByName;
    if (thing instanceof Familiar) return this.familiarByName;
    if (thing instanceof Monster) return this.monsterByName;
    return new Map();
  }

  findThingByName(name: string): Thing | null {
    const formattedName = cleanString(name.toLowerCase().trim());
    return (
      this.skillByName.get(formattedName) ||
      this.itemByName.get(formattedName) ||
      this.monsterByName.get(formattedName) ||
      this.familiarByName.get(formattedName) ||
      this.effectByName.get(formattedName) ||
      null
    );
  }

  findItemByName(name: string): Item | null {
    return this.itemByName.get(cleanString(name.toLowerCase().trim())) || null;
  }

  findMonsterByName(name: string): Monster | null {
    return (
      this.monsterByName.get(cleanString(name.toLowerCase().trim())) || null
    );
  }

  register(thing: Thing): void {
    const formattedName = cleanString(thing.name.toLowerCase().trim());
    this.getMapForThing(thing).set(formattedName, thing);

    if (thing instanceof Item) {
      this.itemById.set(thing.id, thing);
      if (thing.descid != null) this.itemByDescId.set(thing.descid, thing);
    }
    if (thing instanceof Monster) {
      this.monsterById.set(thing.id, thing);
    }
  }

  async load() {
    try {
      await this.#client.load();
      const em = this.#client.query;

      const skills = await em.find(DolSkill, {}, { populate: ["modifiers"] });
      for (const s of skills) {
        const skill = new Skill(s);
        this.register(skill);
        const block = skill.block();
        if (!this.#lastSkills[block] || skill.id > this.#lastSkills[block]) {
          this.#lastSkills[block] = skill.id;
        }
      }

      const effects = await em.find(DolEffect, {}, { populate: ["modifiers"] });
      for (const e of effects) {
        this.register(new Effect(e));
      }

      const monsters = await em.find(
        DolMonster,
        {},
        { populate: ["drops.item"] },
      );
      for (const m of monsters) {
        this.register(new Monster(m));
      }

      const familiars = await em.find(
        DolFamiliar,
        {},
        {
          populate: [
            "larva.modifiers",
            "larva.consumable",
            "larva.equipment",
            "equipment.modifiers",
            "equipment.consumable",
            "equipment.equipment",
            "modifiers",
          ],
        },
      );
      for (const f of familiars) {
        const familiar = new Familiar(f);
        this.register(familiar);
        if (familiar.id > this.#lastFamiliar) this.#lastFamiliar = familiar.id;
      }

      const items = await em.find(
        DolItem,
        {},
        {
          populate: [
            "modifiers",
            "consumable",
            "equipment",
            "foldGroups.items",
            "zapGroups.items",
          ],
        },
      );
      for (const i of items) {
        const item = new Item(i);
        this.register(item);
        if (item.id > this.#lastItem) this.#lastItem = item.id;
      }

      // Wire up familiar hatchling/equipment descriptions
      for (const familiar of this.familiars) {
        if (familiar.hatchling) familiar.hatchling.addGrowingFamiliar(familiar);
        if (familiar.familiarEquipment)
          familiar.familiarEquipment.addEquppingFamiliar(familiar);
      }

      pizzaTree.build(this.effectByName);
      this.#loaded = true;
    } catch (e) {
      console.warn(
        "data-of-loathing unavailable, running in degraded mode:",
        e,
      );
    }

    this.lastDownloadTime = Date.now();
  }

  async reload(): Promise<boolean> {
    if (this.lastDownloadTime < Date.now() - 3600000) {
      this.clearMaps();
      clearMemoized(["things"]);
      this.#loaded = false;
      await this.load();
      return true;
    }
    return false;
  }

  @memoize({ tags: ["things"] })
  get items(): Item[] {
    return [...this.itemByName.values()];
  }

  @memoize({ tags: ["things"] })
  get monsters(): Monster[] {
    return [...this.monsterByName.values()];
  }

  @memoize({ tags: ["things"] })
  get skills(): Skill[] {
    return [...this.skillByName.values()];
  }

  @memoize({ tags: ["things"] })
  get familiars(): Familiar[] {
    return [...this.familiarByName.values()];
  }

  @memoize({ tags: ["things"] })
  get effects(): Effect[] {
    return [...this.effectByName.values()];
  }

  findMonsterById(id: number): Monster | undefined {
    return this.monsterById.get(id);
  }
  findItemById(id: number): Item | undefined {
    return this.itemById.get(id);
  }
  findItemByDescId(descid: number): Item | undefined {
    return this.itemByDescId.get(descid);
  }

  isItemIdKnown(id: number) {
    return this.knownItemIds.has(id);
  }

  async getEmbed(item: string): Promise<EmbedBuilder | null> {
    const foundName = await wikiClient.findName(item);
    if (!foundName) return null;

    const thing = this.findThingByName(foundName.name);
    const title = thing?.name ?? foundName.name;
    const embed = createEmbed().setTitle(title).setURL(foundName.url);

    if (thing) return await thing.addToEmbed(embed);
    if (foundName.image) return embed.setImage(foundName.image);
    return embed;
  }

  @memoize({ tags: ["things"] })
  getWikiLink(thing: Thing) {
    return toWikiLink(thing.wiki);
  }
}

export const dataOfLoathingClient = new DataOfLoathingClient();
