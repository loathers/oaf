import axios, { AxiosError } from "axios";
import { EmbedBuilder } from "discord.js";

import { Effect, Familiar, Item, Monster, Skill, Thing } from "../things";
import { isItem } from "../things/Item";
import { cleanString } from "../utils";
import { createEmbed } from "./discord";
import { pizzaTree } from "./pizza";

export class WikiDownError extends Error {
  constructor() {
    super("Wiki is down");
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
  ["packaged knock-off retro superhero cape", "unwrapped knock-off retro superhero cape"],
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
  return await axios.get<string>(
    `https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/${fileName}.txt`
  );
}

export class WikiClient {
  private _nameMap: Map<string, FoundName> = new Map();
  private _thingMap: Map<string, Thing> = new Map();
  private knownItemIds = new Set<number>();
  private _searchApiKey: string;
  private _customSearch: string;
  private _finalItemId = -1;
  private _finalFamiliarId = -1;
  private _finalSkillIds: { [block: number]: number } = {};
  private _lastDownloadTime = -1;

  constructor(googleApiKey: string, customSearch: string) {
    this._searchApiKey = googleApiKey;
    this._customSearch = customSearch;
  }

  get lastItem(): number {
    return this._finalItemId;
  }

  get lastFamiliar(): number {
    return this._finalFamiliarId;
  }

  get lastSkills(): { [block: number]: number } {
    return this._finalSkillIds;
  }

  retrieve(name: string): Thing | null {
    const formattedName = cleanString(name.toLowerCase().trim());
    return this._thingMap.get(formattedName) ?? null;
  }

  register(thing: Thing): void {
    const formattedName = cleanString(thing.name.toLowerCase().trim());
    this._thingMap.set(formattedName, thing);
  }

  async loadItemTypes(itemTypes: Map<string, string[]>) {
    for (let fileName of ["equipment", "spleenhit", "fullness", "inebriety"]) {
      const file = await downloadMafiaData(fileName);
      for (let line of file.data.split(/\n/)) {
        try {
          const item = line.split("\t");
          if (item.length > 1) itemTypes.set(cleanString(item[0]).toLowerCase(), item);
        } catch {}
      }
    }
  }

  async loadSkills() {
    const file = await downloadMafiaData("classskills");
    for (let line of file.data.split(/\n/)) {
      try {
        const skill = Skill.from(line);
        const block = skill.block();
        if (skill.id > (this._finalSkillIds[block] || 0)) {
          this._finalSkillIds[block] = skill.id;
        }
        if (skill.name) {
          this.register(skill);
        }
      } catch {}
    }
  }

  async loadItems(itemInfoForUse: Map<string, string[]>, avatarPotions: Set<string>) {
    const file = await downloadMafiaData("items");
    for (let line of file.data.split(/\n/)) {
      try {
        const item = Item.from(line, itemInfoForUse);
        if (item.id > this._finalItemId) this._finalItemId = item.id;
        this.knownItemIds.add(item.id);
        if (item.name) {
          this.register(item);
          if (item.types.includes("avatar")) {
            avatarPotions.add(item.name.toLowerCase());
          }
          const unpackagedName = PACKAGES.get(item.name.toLowerCase());
          if (unpackagedName) {
            const contents = this.retrieve(unpackagedName);
            if (contents && contents instanceof Item) {
              contents.container = item;
              item.contents = contents;
            }
          }
          const packageName = REVERSE_PACKAGES.get(item.name.toLowerCase());
          if (packageName) {
            const container = this.retrieve(packageName);
            if (container && container instanceof Item) {
              container.contents = item;
              item.container = container;
            }
          }
        }
      } catch (error) {}
    }
  }

  async loadZapGroups() {
    const file = await downloadMafiaData("zapgroups");
    for (const line of file.data.split(/\n/)) {
      if (line.length && !line.startsWith("#")) {
        try {
          const group = line
            .replaceAll("\\,", "🍕")
            .split(",")
            .map((itemName) => itemName.replaceAll("🍕", ","))
            .map((itemName) => this.retrieve(itemName))
            .filter(isItem);
          for (const item of group) {
            item.zapGroup = group;
          }
        } catch (error) {}
      }
    }
  }

  async loadFoldGroups() {
    const file = await downloadMafiaData("foldgroups");
    for (const line of file.data.split(/\n/)) {
      if (line.length && !line.startsWith("#")) {
        try {
          const group = line
            .split("\t")
            .slice(1)
            .map((itemName: string) => this.retrieve(itemName))
            .filter(isItem);
          for (const item of group) {
            item.foldGroup = group;
          }
        } catch (error) {}
      }
    }
  }

  async loadMonsters() {
    const file = await downloadMafiaData("monsters");
    for (const line of file.data.split(/\n/)) {
      try {
        const monster = Monster.from(line);
        if (monster.name) {
          this.register(monster);
        }
      } catch {}
    }
  }

  async loadFamiliars() {
    const file = await downloadMafiaData("familiars");
    for (const line of file.data.split(/\n/)) {
      try {
        const familiar = Familiar.from(line);

        if (this._finalFamiliarId < familiar.id) this._finalFamiliarId = familiar.id;

        if (familiar) {
          const hatchling = this.retrieve(familiar.larva);

          if (hatchling instanceof Item) {
            familiar.hatchling = hatchling;
            hatchling.addGrowingFamiliar(familiar);
          }

          const equipment = this.retrieve(familiar.item);

          if (equipment instanceof Item) {
            familiar.equipment = equipment;
            this.register(familiar);
            equipment.addEquppingFamiliar(familiar);
          }
        }
      } catch {}
    }
  }

  async loadEffects(avatarPotions: Set<string>) {
    const file = await downloadMafiaData("statuseffects");
    for (let line of file.data.split(/\n/)) {
      try {
        const effect = Effect.from(line, avatarPotions);
        if (effect) this.register(effect);
      } catch {}
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
    await this.loadZapGroups();
    console.log("Loading monsters...");
    await this.loadMonsters();
    console.log("Loading familiars...");
    await this.loadFamiliars();
    console.log("Loading effects...");
    await this.loadEffects(avatarPotions);

    pizzaTree.build(this._thingMap);
    this._lastDownloadTime = Date.now();
  }

  async reloadMafiaData(): Promise<boolean> {
    if (this._lastDownloadTime < Date.now() - 3600000) {
      this._thingMap.clear();
      await this.loadMafiaData();
      return true;
    }
    return false;
  }

  get items(): Item[] {
    return [...this._thingMap.values()].filter(isItem);
  }

  isItemIdKnown(id: number) {
    return this.knownItemIds.has(id);
  }

  async getEmbed(item: string): Promise<EmbedBuilder | undefined> {
    const foundName = await this.findName(item);
    if (!foundName) return undefined;

    const embed = createEmbed().setTitle(foundName.name).setURL(foundName.url);

    const thing = this.retrieve(foundName.name);
    if (thing) {
      await thing.addToEmbed(embed);
    } else if (foundName.image) {
      embed.setImage(foundName.image.replace("https", "http"));
    } else {
      embed.setImage("http://kol.coldfront.net/thekolwiki/vis_sig.jpg");
    }

    return embed;
  }

  async findName(searchTerm: string): Promise<FoundName | undefined> {
    if (!searchTerm.length) return undefined;
    if (this._nameMap.has(searchTerm.toLowerCase()))
      return this._nameMap.get(searchTerm.toLowerCase());
    const cleanedSearchTerm = emoteNamesFromEmotes(searchTerm);
    const wikiName = cleanedSearchTerm.replace(/\s/g, "_");
    const wikiSearchName = cleanedSearchTerm.replace(/\s/g, "+");
    const wikiSearchNameCrushed = cleanedSearchTerm
      .replace(/[^A-Za-z0-9\s]/g, "")
      .toLowerCase()
      .replace(/\s/g, "+");
    console.log("Trying precise wiki page");
    try {
      const directWikiResponse = await axios(
        `https://kol.coldfront.net/thekolwiki/index.php/${wikiName}`
      );
      const directResponseUrl = String(directWikiResponse.request.res.responseUrl);
      if (directResponseUrl.indexOf("index.php?search=") < 0) {
        const name = nameFromWikiPage(directResponseUrl, directWikiResponse.data);
        const image = imageFromWikiPage(directResponseUrl, directWikiResponse.data);
        this._nameMap.set(searchTerm.toLowerCase(), { name: name, url: directResponseUrl, image });
        return this._nameMap.get(searchTerm.toLowerCase());
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === "ENOTFOUND") throw new WikiDownError();
        console.error(error);
      } else {
        throw error;
      }
    }
    console.log("Not found as wiki page");
    console.log("Trying wiki search");
    try {
      const wikiSearchResponse = await axios(
        `https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchName}`
      );
      const searchResponseUrl = String(wikiSearchResponse.request.res.responseUrl);
      if (searchResponseUrl.indexOf("index.php?search=") < 0) {
        const name = nameFromWikiPage(searchResponseUrl, wikiSearchResponse.data);
        const image = imageFromWikiPage(searchResponseUrl, wikiSearchResponse.data);
        this._nameMap.set(searchTerm.toLowerCase(), { name: name, url: searchResponseUrl, image });
        return this._nameMap.get(searchTerm.toLowerCase());
      }
    } catch (error: any) {
      console.log(error.toString());
    }
    console.log("Not found in wiki search");
    console.log("Trying stripped wiki search");
    try {
      const crushedWikiSearchResponse = await axios(
        `https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchNameCrushed}`
      );
      const crushedSearchResponseUrl = String(crushedWikiSearchResponse.request.res.responseUrl);
      if (crushedSearchResponseUrl.indexOf("index.php?search=") < 0) {
        const name = nameFromWikiPage(crushedSearchResponseUrl, crushedWikiSearchResponse.data);
        const image = imageFromWikiPage(crushedSearchResponseUrl, crushedWikiSearchResponse.data);
        this._nameMap.set(searchTerm.toLowerCase(), {
          name: name,
          url: crushedSearchResponseUrl,
          image,
        });
        return this._nameMap.get(searchTerm.toLowerCase());
      }
    } catch (error: any) {
      console.log(error.toString());
    }
    console.log("Not found in stripped wiki search");
    console.log("Trying google search");
    try {
      const googleSearchResponse = await axios(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          key: this._searchApiKey,
          cx: this._customSearch,
          q: cleanedSearchTerm,
        },
      });
      const googledPage = await axios(googleSearchResponse.data.items[0].link);
      const name = nameFromWikiPage(googleSearchResponse.data.items[0].link, googledPage.data);
      const image = imageFromWikiPage(googleSearchResponse.data.items[0].link, googledPage.data);
      this._nameMap.set(searchTerm.toLowerCase(), {
        name: name,
        url: googleSearchResponse.data.items[0].link,
        image,
      });
      return this._nameMap.get(searchTerm.toLowerCase());
    } catch (error: any) {
      console.log(error.toString());
    }
    console.log("Google search stumped, I give up");
    return undefined;
  }
}

function nameFromWikiPage(url: string, data: any): string {
  //Mediawiki redirects are unreliable, so we can't just read off the url, so we do this horrible thing instead.
  const titleMatch = String(data).match(
    /\<h1 id="firstHeading" class="firstHeading" lang="en">\s*<span dir="auto">(?<pageTitle>.+)<\/span><\/h1>/
  );
  let result = "";
  if (titleMatch?.groups && titleMatch.groups.pageTitle) {
    result = titleMatch.groups.pageTitle;
  } else result = decodeURIComponent(url.split("/index.php/")[1]).replace(/\_/g, " ");
  if (result.endsWith(" (item)")) result = result.replace(" (item)", "");
  if (result.endsWith(" (skill)")) result = result.replace(" (skill)", "");
  if (result.endsWith(" (effect)")) result = result.replace(" (effect)", "");
  if (result.endsWith(" (familiar)")) result = result.replace(" (familiar)", "");
  switch (result.toLowerCase()) {
    case "glitch season reward name":
      return "[glitch season reward name]";
    case "monster types":
      return "Category";
    default:
      return result;
  }
}

function imageFromWikiPage(url: string, data: any): string {
  // As far as I know this is always the first relevant image
  const imageMatch = String(data).match(
    /https\:\/\/kol.coldfront.net\/thekolwiki\/images\/[^\"\']*\.gif/
  );
  return imageMatch ? imageMatch[0] : "";
}

function emoteNamesFromEmotes(emoteString: string) {
  return emoteString.replace(/\<a?:(?<emote>[a-zA-Z\-\_]+):[\d]+\>/g, (match) => {
    const emoteName = match.match(/:(?<emote>[a-zA-Z\-\_]+):/);
    return emoteName ? emoteName[1].replace(/:/g, "") : "";
  });
}

export const wikiClient = new WikiClient(
  process.env.GOOGLE_API_KEY || "",
  process.env.CUSTOM_SEARCH || ""
);
