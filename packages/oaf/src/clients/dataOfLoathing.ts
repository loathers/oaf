import { EmbedBuilder } from "discord.js";
import { Memoize, clear } from "typescript-memoize";

import {
  Effect,
  Familiar,
  Item,
  Monster,
  Skill,
  Thing,
} from "../things/index.js";
import { getQueryData } from "../things/query.js";
import { cleanString, toWikiLink } from "../utils.js";
import { createEmbed } from "./discord.js";
import { pizzaTree } from "./pizza.js";
import { wikiClient } from "./wiki.js";

export class DataOfLoathingClient {
  private itemByName: Map<string, Item> = new Map();
  private skillByName: Map<string, Skill> = new Map();
  private effectByName: Map<string, Effect> = new Map();
  private familiarByName: Map<string, Familiar> = new Map();
  private monsterByName: Map<string, Monster> = new Map();

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
    this.skillByName.clear();
    this.effectByName.clear();
    this.familiarByName.clear();
    this.monsterByName.clear();
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

  register(thing: Thing): void {
    const formattedName = cleanString(thing.name.toLowerCase().trim());
    this.getMapForThing(thing).set(formattedName, thing);
  }

  async load() {
    const data = await getQueryData();

    for (const s of data.allSkills?.nodes ?? []) {
      if (s === null) continue;
      this.register(new Skill(s));
    }

    for (const e of data.allEffects?.nodes ?? []) {
      if (e === null) continue;
      this.register(new Effect(e));
    }

    for (const m of data.allMonsters?.nodes ?? []) {
      if (m === null) continue;
      this.register(new Monster(m));
    }

    for (const f of data.allFamiliars?.nodes ?? []) {
      if (f === null) continue;
      this.register(new Familiar(f));
    }

    for (const i of data.allItems?.nodes ?? []) {
      if (i === null) continue;
      this.register(new Item(i));
    }

    pizzaTree.build(this.effectByName);
    this.lastDownloadTime = Date.now();
  }

  async reload(): Promise<boolean> {
    if (this.lastDownloadTime < Date.now() - 3600000) {
      this.clearMaps();
      clear(["things"]);
      await this.load();
      return true;
    }
    return false;
  }

  @Memoize({ tags: ["things"] })
  get items(): Item[] {
    return [...this.itemByName.values()];
  }

  @Memoize({ tags: ["things"] })
  get monsters(): Monster[] {
    return [...this.monsterByName.values()];
  }

  @Memoize({ tags: ["things"] })
  get skills(): Skill[] {
    return [...this.skillByName.values()];
  }

  @Memoize({ tags: ["things"] })
  get effects(): Effect[] {
    return [...this.effectByName.values()];
  }

  isItemIdKnown(id: number) {
    return this.knownItemIds.has(id);
  }

  async getEmbed(item: string): Promise<EmbedBuilder | null> {
    const foundName = await wikiClient.findName(item);
    if (!foundName) return null;

    const thing = this.findThingByName(foundName.name);

    // Title should be canonical name, else whatever the title of the wiki page is.
    const title = thing?.name ?? foundName.name;

    const embed = createEmbed().setTitle(title).setURL(foundName.url);

    if (thing) return await thing.addToEmbed(embed);
    if (foundName.image) return embed.setImage(foundName.image);

    return embed;
  }

  getWikiName(thing: Thing) {
    const modifiers = thing.getModifiers();
    if (modifiers && "Wiki Name" in modifiers) {
      const wikiName = modifiers["Wiki Name"];
      if (typeof wikiName !== "string") return null;
      return wikiName.slice(1, -1);
    }

    return thing.name.replace(/ /g, "_");
  }

  @Memoize({ tags: ["things"] })
  getWikiLink(thing: Thing) {
    const wikiName = this.getWikiName(thing);
    if (!wikiName) return null;

    return toWikiLink(wikiName);
  }
}

export const dataOfLoathingClient = new DataOfLoathingClient();
