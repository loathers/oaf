import axios from "axios";
import { MessageEmbed } from "discord.js";
import { Effect, Familiar, Item, Monster, Skill, Thing } from "./things";
import { KOLClient } from "./kolclient";
import { cleanString } from "./utils";
import { PACKAGES, REVERSE_PACKAGES } from "./constants";

type FoundName = {
  name: string;
  url: string;
};

class PizzaNode {
  children: Map<string, PizzaNode> = new Map();
  letters: string;
  effects: Effect[] = [];

  constructor(letters: string) {
    this.letters = letters;
  }

  addEffectToTree(name: string, effect: Effect): void {
    if (this.letters.length === 4 || name.length === 0 || name.match(/^[^a-z0-9\"\']/)) {
      this.effects.push(effect);
    } else {
      let letter = name.charAt(0);
      let child =
        this.children.get(letter) ||
        this.children.set(letter, new PizzaNode(this.letters + letter)).get(letter);
      child?.addEffectToTree(name.slice(1), effect);
    }
  }

  addPizzaToEffects(): void {
    let options = this.options();
    for (let option of options) {
      option._pizza = {
        letters: this.letters.toUpperCase(),
        options: options.length,
      };
    }
    if (options.length > 1) {
      for (let child of this.children.values()) {
        child.addPizzaToEffects();
      }
    }
  }

  options(): Effect[] {
    return Array.from(this.children.values()).reduce(
      (acc, curr) => acc.concat(curr.options()),
      this.effects
    );
  }
}

export class WikiSearcher {
  private _nameMap: Map<string, FoundName> = new Map();
  private _thingMap: Map<string, Thing> = new Map();
  private _pizzaTreeRoot: PizzaNode = new PizzaNode("");
  private _client: KOLClient;
  private _searchApiKey: string;
  private _customSearch: string;
  private _finalItemId = -1;
  private _finalFamiliarId = -1;
  private _finalSkillIds: { [block: number]: number } = {};
  private _lastDownloadTime = -1;

  constructor(client: KOLClient) {
    this._searchApiKey = process.env.GOOGLE_API_KEY || "";
    this._customSearch = process.env.CUSTOM_SEARCH || "";
    this._client = client;
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

  async downloadMafiaData(): Promise<void> {
    const itemMap = new Map<string, string[]>();
    const avatarPotionSet = new Set<string>();
    console.log("Reading item data.");
    for (let fileName of ["equipment", "spleenhit", "fullness", "inebriety"]) {
      const file = await axios(
        `https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/${fileName}.txt`
      );
      for (let line of file.data.split(/\n/)) {
        try {
          const item = line.split("\t");
          if (item.length > 1) itemMap.set(cleanString(item[0]).toLowerCase(), item);
        } catch {}
      }
    }
    console.log("Reading skills.");
    const skillFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/classskills.txt"
    );
    for (let line of skillFile.data.split(/\n/)) {
      try {
        const skill = new Skill(line);
        const block = skill.block();
        // We only care about the 0 and 7 blocks realistically
        if ([0, 7].includes(block) && skill._skill.id > (this._finalSkillIds[block] || 0)) {
          this._finalSkillIds[block] = skill._skill.id;
        }
        if (skill.name()) {
          this._thingMap.set(skill.name(), skill);
        }
      } catch {}
    }
    console.log("Reading items.");
    const itemFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/items.txt"
    );
    for (let line of itemFile.data.split(/\n/)) {
      try {
        const item = new Item(line, itemMap);
        if (item.get().id > this._finalItemId) this._finalItemId = item.get().id;
        if (item.name()) {
          this._thingMap.set(item.name(), item);
          if (item.get().types.includes("avatar")) {
            avatarPotionSet.add(item.name());
          }
          if (PACKAGES.get(item.name())) {
            const contents = this._thingMap.get(PACKAGES.get(item.name()) as string);
            if (contents) {
              (contents as Item).addContainer(item);
              item.addContents(contents as Item);
            }
          }
          if (REVERSE_PACKAGES.get(item.name())) {
            const container = this._thingMap.get(REVERSE_PACKAGES.get(item.name()) as string);
            if (container) {
              (container as Item).addContents(item);
              item.addContainer(container as Item);
            }
          }
        }
      } catch (error) {}
    }
    const zapFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/zapgroups.txt"
    );
    for (let line of zapFile.data.split(/\n/)) {
      if (line.length && !line.startsWith("#")) {
        try {
          const group = line
            .replaceAll("\\,", "🍕")
            .split(",")
            .map((itemName: string) => itemName.replaceAll("🍕", ","))
            .map((itemName: string) =>
              this._thingMap.get(cleanString(itemName.trim()).toLowerCase())
            )
            .filter((item: Item | undefined) => !!item);
          for (let item of group) {
            (item as Item).addZapGroup(group);
          }
        } catch (error) {}
      }
    }

    const foldFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/foldgroups.txt"
    );
    for (let line of foldFile.data.split(/\n/)) {
      if (line.length && !line.startsWith("#")) {
        try {
          const group = line
            .split("\t")
            .slice(1)
            .map((itemName: string) => this._thingMap.get(cleanString(itemName).toLowerCase()))
            .filter((item: Item | undefined) => !!item);
          for (let item of group) {
            (item as Item).addFoldGroup(group);
          }
        } catch (error) {}
      }
    }

    console.log("Reading monsters.");
    const monsterFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/monsters.txt"
    );
    for (let line of monsterFile.data.split(/\n/)) {
      try {
        const monster = new Monster(line);
        if (monster.name()) {
          this._thingMap.set(monster.name(), monster);
        }
      } catch {}
    }

    console.log("Reading familiars.");
    const familiarFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/familiars.txt"
    );
    for (let line of familiarFile.data.split(/\n/)) {
      try {
        const familiar = new Familiar(line);
        if (this._finalFamiliarId < familiar.get().id) this._finalFamiliarId = familiar.get().id;
        if (familiar.name()) {
          const hatchling = this._thingMap.get(familiar.get().larva.toLowerCase()) as Item;
          familiar.addHatchling(hatchling);
          hatchling.addGrowingFamiliar(familiar);
          familiar.addEquipment(this._thingMap.get(familiar.get().item.toLowerCase()) as Item);
          this._thingMap.set(familiar.name(), familiar);
          (this._thingMap.get(familiar.get().item.toLowerCase()) as Item).addEquppingFamiliar(
            familiar
          );
        }
      } catch {}
    }

    console.log("Reading effects.");
    const effectsFile = await axios(
      "https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/statuseffects.txt"
    );
    for (let line of effectsFile.data.split(/\n/)) {
      try {
        const effect = new Effect(line, avatarPotionSet);
        if (effect.name()) {
          this._thingMap.set(effect.name(), effect);
          if (effect.get().hookah) {
            this._pizzaTreeRoot.addEffectToTree(effect.name(), effect);
          }
        }
      } catch {}
    }

    this._pizzaTreeRoot.addPizzaToEffects();
    this._lastDownloadTime = Date.now();
  }

  async reloadMafiaData(): Promise<void> {
    this._thingMap.clear();
    this._pizzaTreeRoot = new PizzaNode("");
    await this.downloadMafiaData();
  }

  async conditionallyReloadMafiaData(): Promise<boolean> {
    if (this._lastDownloadTime < Date.now() - 3600000) {
      await this.reloadMafiaData();
      return true;
    }
    return false;
  }

  async getEmbed(item: string): Promise<MessageEmbed | undefined> {
    const foundName = await this.findName(item);
    if (!foundName) return undefined;
    const embed = new MessageEmbed().setTitle(foundName.name).setURL(foundName.url).setFooter({
      text: "Problems? Message DocRostov#7004 on discord.",
      iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
    });
    if (this._thingMap.has(foundName.name.toLowerCase())) {
      const thing = this._thingMap.get(foundName.name.toLowerCase());
      await thing?.addToEmbed(embed, this._client);
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
        this._nameMap.set(searchTerm.toLowerCase(), { name: name, url: directResponseUrl });
        return this._nameMap.get(searchTerm.toLowerCase());
      }
    } catch (error: any) {
      console.log(error.toString());
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
        this._nameMap.set(searchTerm.toLowerCase(), { name: name, url: searchResponseUrl });
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
        this._nameMap.set(searchTerm.toLowerCase(), { name: name, url: crushedSearchResponseUrl });
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
      const name = nameFromWikiPage(googleSearchResponse.data.items[0].link, "");
      this._nameMap.set(searchTerm.toLowerCase(), {
        name: name,
        url: googleSearchResponse.data.items[0].link,
      });
      return this._nameMap.get(searchTerm.toLowerCase());
    } catch (error: any) {
      console.log(error.toString());
    }
    console.log("Google search stumped, I give up");
    return undefined;
  }

  async getPizzaEmbed(letters: string): Promise<MessageEmbed> {
    let node = this._pizzaTreeRoot;
    let i = 0;
    for (; i <= letters.length; i++) {
      const child = node.children.get(letters.charAt(i));
      if (child) node = child;
      else break;
    }

    const options = node.options();
    if (options.length > 11) {
      return new MessageEmbed()
        .setTitle(`Possible ${letters.toUpperCase().padEnd(4, "✱")} Pizza effects`)
        .setDescription(
          `${letters.match(/^[aeiouAEIOU]/) ? "An" : "A"} ${letters.toUpperCase().padEnd(4, "✱")}${
            i < letters.length
              ? ` (functionally ${letters.slice(0, i).toUpperCase().padEnd(4, "✱")})`
              : ""
          } Diabolic Pizza has too many possible effects to list.`
        )
        .setFooter({
          text: "Problems? Message DocRostov#7004 on discord.",
          iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
        });
    }
    if (options.length === 1) {
      return (await this.getEmbed(options[0].name())) || new MessageEmbed();
    }
    let description = "";
    if (i < letters.length) {
      description += `(Note: A ${letters
        .toUpperCase()
        .padEnd(4, "✱")} pizza functions as a ${letters
        .slice(0, i)
        .toUpperCase()
        .padEnd(4, "✱")} pizza)\n`;
    }
    description += (
      await Promise.all(
        options.map(async (effect) => {
          const foundName = await this.findName(effect.name());
          return `[${foundName?.name}](${encodeURI(foundName?.url || "")})`;
        })
      )
    ).join("\n");

    return new MessageEmbed()
      .setTitle(`Possible ${letters.toUpperCase().padEnd(4, "✱")} Pizza effects`)
      .setDescription(description)
      .setFooter({
        text: "Problems? Message DocRostov#7004 on discord.",
        iconURL: "http://images.kingdomofloathing.com/itemimages/oaf.gif",
      });
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

function emoteNamesFromEmotes(emoteString: string) {
  return emoteString.replace(/\<a?:(?<emote>[a-zA-Z\-\_]+):[\d]+\>/g, (match) => {
    const emoteName = match.match(/:(?<emote>[a-zA-Z\-\_]+):/);
    return emoteName ? emoteName[1].replace(/:/g, "") : "";
  });
}
