import { EmbedBuilder } from "discord.js";
import { StatusCodes } from "http-status-codes";
import { Memoize, clear } from "typescript-memoize";
import { Agent, fetch } from "undici";

import { config } from "../config.js";
import {
  Effect,
  Familiar,
  Item,
  Monster,
  Skill,
  Thing,
} from "../things/index.js";
import { cleanString, notNull } from "../utils.js";
import { createEmbed } from "./discord.js";
import { googleSearch } from "./googleSearch.js";
import { pizzaTree } from "./pizza.js";

const insecureAgent = new Agent({
  connect: {
    ciphers: "DEFAULT:@SECLEVEL=1",
  },
});

export class WikiSearchError extends Error {
  step: string;
  url?: string;
  constructor(step: string, url?: string) {
    super("Wiki search error");
    this.step = step;
    this.url = url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const PACKAGES = new Map([
  ["iceberglet", "ice pick"],
  ["great ball of frozen fire", "evil flaming eyeball pendant"],
  ["naughty origami kit", "naughty paper shuriken"],
  ["packet of mayfly bait", "mayfly bait necklace"],
  ["container of spooky putty", "spooky putty sheet"],
  ["stinky cheese ball", "stinky cheese diaper"],
  ["grumpy bumpkin's pumpkin seed catalog", "packet of pumpkin seeds"],
  ["make-your-own-vampire-fangs kit", "plastic vampire fangs"],
  ["mint salton pepper's peppermint seed catalog", "peppermint pip packet"],
  ["pete & jackie's dragon tooth emporium catalog", "packet of dragon's teeth"],
  ["folder holder", "over-the-shoulder folder holder"],
  ["discontent™ winter garden catalog", "packet of winter seeds"],
  ["ed the undying exhibit crate", "the crown of ed the undying"],
  ["pack of every card", "deck of every card"],
  ["diy protonic accelerator kit", "protonic accelerator pack"],
  ["dear past self package", "time-spinner"],
  ["suspicious package", "kremlin's greatest briefcase"],
  ["li-11 motor pool voucher", "asdon martin keyfob"],
  ["corked genie bottle", "genie bottle"],
  ["pantogram", "portable pantogram"],
  ["locked mumming trunk", "mumming trunk"],
  ["january's garbage tote (unopened)", "january's garbage tote"],
  ["pokéfam guide to capturing all of them", "packet of tall grass seeds"],
  ["songboom™ boombox box", "songboom™ boombox"],
  ["bastille batallion control rig crate", "bastille batallion control rig"],
  ["latte lovers club card", "latte lovers member's mug"],
  ["kramco industries packing carton", "kramco sausage-o-matic™"],
  ["mint condition lil' doctor™ bag", "lil' doctor™ bag"],
  ["vampyric cloake pattern", "vampyric cloake"],
  ["fourth of may cosplay saber kit", "fourth of may cosplay saber"],
  ["rune-strewn spoon cocoon", "hewn moon-rune spoon"],
  ["beach comb box", "beach comb"],
  ["unopened eight days a week pill keeper", "eight days a week pill keeper"],
  ["unopened diabolic pizza cube box", "diabolic pizza cube"],
  ["mint-in-box powerful glove", "powerful glove"],
  ["better shrooms and gardens catalog", "packet of mushroom spores"],
  ["guzzlr application", "guzzlr tablet"],
  ["bag of iunion stones", "iunion crown"],
  ["packaged spinmaster™ lathe", "spinmaster™ lathe"],
  ["bagged cargo cultist shorts", "cargo cultist shorts"],
  [
    "packaged knock-off retro superhero cape",
    "unwrapped knock-off retro superhero cape",
  ],
  ["box o' ghosts", "greedy ghostling"],
  ["packaged miniature crystal ball", "miniature crystal ball"],
  ["emotion chip", "spinal-fluid-covered emotion chip"],
  ["power seed", "potted power plant"],
  ["packaged backup camera", "backup camera"],
  ["packaged familiar scrapbook", "familiar scrapbook"],
  ["packaged industrial fire extinguisher", "industrial fire extinguisher"],
  ["packaged daylight shavings helmet", "daylight shavings helmet"],
  ["packaged cold medicine cabinet", "cold medicine cabinet"],
  ["undrilled cosmic bowling ball", "cosmic bowling ball"],
  ["combat lover's locket lockbox", "combat lover's locket"],
  ["undamaged unbreakable umbrella", "unbreakable umbrella"],
  ["retrospecs try-at-home kit", "retrospecs"],
  ["fresh can of paint", "fresh coat of paint"],
  ["mint condition magnifying glass", "cursed magnifying glass"],
  ["packaged june cleaver", "june cleaver"],
  ["designer sweatpants (new old stock)", "designer sweatpants"],
  ["unopened tiny stillsuit", "tiny stillsuit"],
  ["packaged jurassic parka", "jurassic parka"],
  ["boxed autumn-aton", "autumn-aton"],
  ["packaged model train set", "model train set"],
  ["rock garden guide", "packet of rock seeds"],
  ["s.i.t. course voucher", "s.i.t. course completion certificate"],
  ["closed-circuit phone system", "closed-circuit pay phone"],
  ["cursed monkey glove", "cursed monkey's paw"],
  ["shrink-wrapped cincho de mayo", "cincho de mayo"],
  ["shrink-wrapped 2002 mr. store catalog", "2002 mr. store catalog"],
  ["boxed august scepter", "august scepter"],
  ["book of facts", "book of facts (dog-eared)"],
  ["wrapped candy cane sword cane", "candy cane sword cane"],
  ["in-the-box spring shoes", "spring shoes"],
  ["black and white apron enrollment form", "black and white apron meal kit"],
]);

const ghostlings: [string, string][] = [
  ["grinning ghostling", "box o' ghosts"],
  ["gregarious ghostling", "box o' ghosts"],
  ["greedy ghostling", "box o' ghosts"],
];

const foldables: [string, string][] = [
  ["ice baby", "iceberglet"],
  ["ice pick", "iceberglet"],
  ["ice skates", "iceberglet"],
  ["ice sickle", "iceberglet"],
  ["liar's pants", "great ball of frozen fire"],
  ["flaming juggler's balls", "great ball of frozen fire"],
  ["flaming pink shirt", "great ball of frozen fire"],
  ["flaming familiar doppelgänger", "great ball of frozen fire"],
  ["evil flaming eyeball pendant", "great ball of frozen fire"],
  ["naughty paper shuriken", "naughty origami kit"],
  ["origami pasties", "naughty origami kit"],
  ["origami riding crop", "naughty origami kit"],
  ['origami "gentlemen\'s" magazine', "naughty origami kit"],
  ["naughty fortune teller", "naughty origami kit"],
  ["spooky putty mitre", "container of spooky putty"],
  ["spooky putty leotard", "container of spooky putty"],
  ["spooky putty ball", "container of spooky putty"],
  ["spooky putty sheet", "container of spooky putty"],
  ["spooky putty snake", "container of spooky putty"],
  ["stinky cheese sword", "stinky cheese ball"],
  ["stinky cheese diaper", "stinky cheese ball"],
  ["stinky cheese wheel", "stinky cheese ball"],
  ["stinky cheese eye", "stinky cheese ball"],
  ["staff of queso escusado", "stinky cheese ball"],
];

const reversed: [string, string][] = Array.from(PACKAGES.keys()).map((key) => [
  PACKAGES.get(key) || "",
  key,
]);

const REVERSE_PACKAGES = new Map(reversed.concat(ghostlings).concat(foldables));

type FoundName = {
  name: string;
  url: string;
  image?: string;
};

async function downloadMafiaData(fileName: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/${fileName}.txt`,
  );

  return await response.text();
}

export class WikiClient {
  private itemByName: Map<string, Item> = new Map();
  private skillByName: Map<string, Skill> = new Map();
  private effectByName: Map<string, Effect> = new Map();
  private familiarByName: Map<string, Familiar> = new Map();
  private monsterByName: Map<string, Monster> = new Map();

  private knownItemIds = new Set<number>();
  private googleCustomSearch?: string;
  #lastItem = -1;
  #lastFamiliar = -1;
  #lastSkills: { [block: number]: number } = {};
  private lastDownloadTime = -1;

  constructor(googleCustomSearch?: string) {
    this.googleCustomSearch = googleCustomSearch;
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

  async loadItemTypes(itemTypes: Map<string, string[]>) {
    for (const fileName of [
      "equipment",
      "spleenhit",
      "fullness",
      "inebriety",
    ]) {
      const file = await downloadMafiaData(fileName);
      for (const line of file.split(/\n/)) {
        if (!line.length || line.startsWith("#")) continue;
        try {
          const item = line.split("\t");
          if (item.length > 1)
            itemTypes.set(cleanString(item[0]).toLowerCase(), item);
        } catch {
          continue;
        }
      }
    }
  }

  async loadSkills() {
    const file = await downloadMafiaData("classskills");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const skill = Skill.from(line);
        const block = skill.block();
        if (skill.id > (this.#lastSkills[block] || 0)) {
          this.#lastSkills[block] = skill.id;
        }
        if (skill.name) {
          this.register(skill);
        }
      } catch {
        continue;
      }
    }
  }

  async loadItems(
    itemInfoForUse: Map<string, string[]>,
    avatarPotions: Set<string>,
  ) {
    const file = await downloadMafiaData("items");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const item = Item.from(line, itemInfoForUse);
        if (item.id > this.#lastItem) this.#lastItem = item.id;
        this.knownItemIds.add(item.id);
        if (item.name) {
          this.register(item);
          if (item.types.includes("avatar")) {
            avatarPotions.add(item.name.toLowerCase());
          }
          const unpackagedName = PACKAGES.get(item.name.toLowerCase());
          if (unpackagedName) {
            const contents = this.itemByName.get(unpackagedName);
            if (contents) {
              contents.container = item;
              item.contents = contents;
            }
          }
          const packageName = REVERSE_PACKAGES.get(item.name.toLowerCase());
          if (packageName) {
            const container = this.itemByName.get(packageName);
            if (container) {
              container.contents = item;
              item.container = container;
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
  }

  async loadZapGroups() {
    const file = await downloadMafiaData("zapgroups");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const group = line
          .replaceAll("\\,", "🍕")
          .split(",")
          .map((itemName) => itemName.replaceAll("🍕", ","))
          .map((itemName) => this.itemByName.get(itemName) || null)
          .filter(notNull);
        for (const item of group) {
          item.zapGroup = group;
        }
      } catch (error) {
        continue;
      }
    }
  }

  async loadFoldGroups() {
    const file = await downloadMafiaData("foldgroups");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const group = line
          .split("\t")
          .slice(1)
          .map((itemName: string) => this.itemByName.get(itemName) || null)
          .filter(notNull);
        for (const item of group) {
          item.foldGroup = group;
        }
      } catch (error) {
        continue;
      }
    }
  }

  async loadMonsters() {
    const file = await downloadMafiaData("monsters");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const monster = Monster.from(line);
        if (monster.name) {
          this.register(monster);
        }
      } catch {
        continue;
      }
    }
  }

  async loadFamiliars() {
    const file = await downloadMafiaData("familiars");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const familiar = Familiar.from(line);

        if (this.#lastFamiliar < familiar.id) this.#lastFamiliar = familiar.id;

        if (familiar) {
          const hatchling = this.itemByName.get(familiar.larva);

          if (hatchling) {
            familiar.hatchling = hatchling;
            hatchling.addGrowingFamiliar(familiar);
          }

          const equipment = this.itemByName.get(familiar.item);

          if (equipment) {
            familiar.equipment = equipment;
            this.register(familiar);
            equipment.addEquppingFamiliar(familiar);
          }
        }
      } catch {
        continue;
      }
    }
  }

  async loadEffects(avatarPotions: Set<string>) {
    const file = await downloadMafiaData("statuseffects");
    for (const line of file.split(/\n/)) {
      if (!line.length || line.startsWith("#")) continue;
      try {
        const effect = Effect.from(line, avatarPotions);
        if (effect) this.register(effect);
      } catch {
        continue;
      }
    }
  }

  async loadMafiaData(): Promise<void> {
    const itemTypes = new Map<string, string[]>();
    const avatarPotions = new Set<string>();

    console.log("Loading item types...");
    await this.loadItemTypes(itemTypes);
    console.log("Loading skills...");
    await this.loadSkills();
    console.log("Loading items...");
    await this.loadItems(itemTypes, avatarPotions);
    console.log("Loading item groups...");
    await this.loadFoldGroups();
    await this.loadZapGroups();
    console.log("Loading monsters...");
    await this.loadMonsters();
    console.log("Loading familiars...");
    await this.loadFamiliars();
    console.log("Loading effects...");
    await this.loadEffects(avatarPotions);

    pizzaTree.build(this.effectByName);
    this.lastDownloadTime = Date.now();
  }

  async reloadMafiaData(): Promise<boolean> {
    if (this.lastDownloadTime < Date.now() - 3600000) {
      this.clearMaps();
      clear(["things"]);
      await this.loadMafiaData();
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
    const foundName = await this.findName(item);
    if (!foundName) return null;

    const thing = this.findThingByName(foundName.name);

    // Title should be canonical name, else whatever the title of the wiki page is.
    const title = thing?.name ?? foundName.name;

    const embed = createEmbed().setTitle(title).setURL(foundName.url);

    if (thing) {
      await thing.addToEmbed(embed);
    } else if (foundName.image) {
      embed.setImage(foundName.image.replace("https", "http"));
    } else {
      embed.setImage("http://kol.coldfront.net/thekolwiki/vis_sig.jpg");
    }

    return embed;
  }

  private async tryWiki(url: string, stage: string) {
    const response = await fetch(url, { dispatcher: insecureAgent });

    if (!response.ok) {
      if (response.status === StatusCodes.NOT_FOUND) return null;
      throw new WikiSearchError(`kolwiki ${stage}`, url);
    }

    const data = await response.text();
    if (!response.url.includes("index.php?search=")) {
      return await parseFoundName(response.url, data);
    }

    return null;
  }

  private async tryPreciseWikiPage(searchTerm: string) {
    const wikiName = encodeURIComponent(searchTerm).replace(/\s/g, "_");
    return await this.tryWiki(
      `https://kol.coldfront.net/thekolwiki/index.php/${wikiName}`,
      "precise",
    );
  }

  private async tryWikiSearch(searchTerm: string) {
    const wikiSearchName = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    return await this.tryWiki(
      `https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchName}`,
      "search",
    );
  }

  private async tryStrippedWikiSearch(searchTerm: string) {
    const wikiSearchNameCrushed = searchTerm
      .replace(/[^A-Za-z0-9\s]/g, "")
      .toLowerCase()
      .replace(/\s/g, "+");

    return await this.tryWiki(
      `https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchNameCrushed}`,
      "crushed",
    );
  }

  private async tryGoogleSearch(searchTerm: string) {
    if (!this.googleCustomSearch) return null;
    const { results, error } = await googleSearch(
      this.googleCustomSearch,
      searchTerm,
    );

    if (error) {
      if (error.status === StatusCodes.NOT_FOUND) return null;
      throw new WikiSearchError("google");
    }

    // No results found
    if (!results.items?.length) return null;
    return parseFoundName(results.items[0].link);
  }

  @Memoize()
  async findName(searchTerm: string): Promise<FoundName | null> {
    if (!searchTerm.length) return null;
    const clean = emoteNamesFromEmotes(searchTerm).replace(/\u2019/g, "'");
    return (
      (await this.tryPreciseWikiPage(clean)) ||
      (await this.tryWikiSearch(clean)) ||
      (await this.tryStrippedWikiSearch(clean)) ||
      (await this.tryGoogleSearch(clean))
    );
  }

  @Memoize({ tags: ["things"] })
  async getWikiLink(thing: Thing) {
    const type = thing.constructor.name.replace(/^_/, "");

    const block = thing.id < 0 ? -1 : Math.floor(thing.id / 100) * 100;

    let url = `https://kol.coldfront.net/thekolwiki/index.php/${type}s_by_number`;
    if (type !== "Skill") {
      const blockDescription =
        block < 0 ? "negative" : `${Math.max(1, block)}-${block + 99}`;
      url += `_(${blockDescription})`;
    }

    try {
      const request = await fetch(url, { dispatcher: insecureAgent });
      const blockPage = await request.text();

      const pattern =
        type === "Skill"
          ? new RegExp(
              `${thing.id.toString().padStart(4, "0")} <a href="([^"]+)"`,
            )
          : new RegExp(`${thing.id}\\. <a href="([^"]+)"`);

      const match = blockPage.match(pattern);
      if (!match) return null;

      return `https://kol.coldfront.net${match[1]}`;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

async function parseFoundName(url: string, contents?: string) {
  if (!contents)
    contents =
      (await (await fetch(url, { dispatcher: insecureAgent })).text()) || "";
  const name = nameFromWikiPage(url, contents);
  const image = imageFromWikiPage(url, contents);
  return { name, url, image };
}

function nameFromWikiPage(url: string, data: string): string {
  //Mediawiki redirects are unreliable, so we can't just read off the url, so we do this horrible thing instead.
  const titleMatch = String(data).match(
    /<h1 id="firstHeading" class="firstHeading" lang="en">\s*<span dir="auto">(?<pageTitle>.+)<\/span><\/h1>/,
  );
  let result = "";
  if (titleMatch?.groups && titleMatch.groups.pageTitle) {
    result = titleMatch.groups.pageTitle;
  } else
    result = decodeURIComponent(url.split("/index.php/")[1]).replace(/_/g, " ");
  if (result.endsWith(" (item)")) result = result.replace(" (item)", "");
  if (result.endsWith(" (skill)")) result = result.replace(" (skill)", "");
  if (result.endsWith(" (effect)")) result = result.replace(" (effect)", "");
  if (result.endsWith(" (familiar)"))
    result = result.replace(" (familiar)", "");
  switch (result.toLowerCase()) {
    case "glitch season reward name":
      return "[glitch season reward name]";
    case "monster types":
      return "Category";
    default:
      return result;
  }
}

function imageFromWikiPage(url: string, data: string): string {
  // As far as I know this is always the first relevant image
  const imageMatch = String(data).match(
    /https:\/\/kol.coldfront.net\/thekolwiki\/images\/[^"']*\.gif/,
  );
  return imageMatch ? imageMatch[0] : "";
}

function emoteNamesFromEmotes(emoteString: string) {
  return emoteString.replace(/<a?:(?<emote>[a-zA-Z\-_]+):[\d]+>/g, (match) => {
    const emoteName = match.match(/:(?<emote>[a-zA-Z\-_]+):/);
    return emoteName ? emoteName[1].replace(/:/g, "") : "";
  });
}

export const wikiClient = new WikiClient(config.CUSTOM_SEARCH);
