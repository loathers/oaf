import { createClient } from "data-of-loathing";
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
import { cleanString } from "../utils.js";
import { createEmbed } from "./discord.js";
// import packages from "./iotmPackages.json" with { type: "json" };
import { pizzaTree } from "./pizza.js";
import { wikiClient } from "./wiki.js";

// const ghostlings: [string, string][] = [
//   ["grinning ghostling", "box o' ghosts"],
//   ["gregarious ghostling", "box o' ghosts"],
//   ["greedy ghostling", "box o' ghosts"],
// ];

// const reversed: [string, string][] = Array.from(
//   Object.keys(packages) as (keyof typeof packages)[],
// ).map((key) => [packages[key] || "", key]);

// const REVERSE_PACKAGES = new Map(reversed.concat(ghostlings).concat(foldables));

export class MafiaClient {
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

  private client;

  constructor() {
    this.client = createClient();
  }

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
    const data = await this.client.query({
      allItems: {
        nodes: {
          id: true,
          name: true,
          image: true,
          descid: true,
          uses: true,
          quest: true,
          tradeable: true,
          discardable: true,
          gift: true,
          autosell: true,
          itemModifierByItem: {
            modifiers: true,
          },
          foldablesByItem: {
            nodes: {
              foldGroup: true,
            },
          },
          consumableById: {
            adventureRange: true,
            adventures: true,
            stomach: true,
            liver: true,
            spleen: true,
            levelRequirement: true,
            quality: true,
          },
          equipmentById: {
            power: true,
            moxRequirement: true,
            mysRequirement: true,
            musRequirement: true,
            type: true,
          },
        },
      },
      allSkills: {
        nodes: {
          id: true,
          name: true,
          image: true,
          tags: true,
        },
      },
      allEffects: {
        nodes: {
          id: true,
          name: true,
          image: true,
          descid: true,
          quality: true,
          nohookah: true,
          effectModifierByEffect: {
            modifiers: true,
          },
        },
      },
      allFoldGroups: {
        nodes: {
          foldablesByFoldGroup: {
            nodes: {
              item: true,
            },
          },
        },
      },
      allMonsters: {
        nodes: {
          id: true,
          name: true,
          image: true,
          monsterDropsByMonster: {
            nodes: {
              itemByItem: {
                name: true,
                id: true,
              },
              rate: true,
              category: true,
            },
          },
        },
      },
      allFamiliars: {
        nodes: {
          id: true,
          name: true,
          image: true,
          itemByLarva: {
            id: true,
            name: true,
            image: true,
            quest: true,
            tradeable: true,
            discardable: true,
            descid: true,
            gift: true,
            itemModifierByItem: {
              modifiers: true,
            },
          },
          itemByEquipment: {
            id: true,
            name: true,
            image: true,
            quest: true,
            tradeable: true,
            discardable: true,
            descid: true,
            gift: true,
            itemModifierByItem: {
              modifiers: true,
            },
          },
          categories: true,
          attributes: true,
          familiarModifierByFamiliar: {
            modifiers: true,
          },
        },
      },
    });

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
    if (foundName.image)
      return embed.setImage(foundName.image.replace("https", "http"));
    return embed.setImage("http://kol.coldfront.net/thekolwiki/vis_sig.jpg");
  }

  @Memoize({ tags: ["things"] })
  async getWikiLink(thing: Thing) {
    if (!thing) return null;
    const modifiers = thing.getModifiers();
    if (!modifiers) return null;
    if ("Wiki Name" in modifiers === false) return null;
    const wikiName = modifiers["Wiki Name"];
    if (typeof wikiName !== "string") return null;
    return wikiName.slice(1, -1);
  }
}

export const mafiaClient = new MafiaClient();
