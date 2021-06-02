import { VariableManager } from "./variables";
import axios from "axios";
import { MessageEmbed } from "discord.js";
import { Effect, Familiar, Item, Monster, Skill, Thing } from "./things";
import { KOLClient } from "./kolclient";
import { cleanString } from "./utils";

type FoundName = {
  name: string;
  url: string;
};

export class WikiSearcher {
  private _nameMap: Map<string, FoundName> = new Map();
  private _thingMap: Map<string, Thing> = new Map();
  private _client: KOLClient;
  private _searchApiKey: string;
  private _customSearch: string;

  constructor(variableManager: VariableManager, client: KOLClient) {
    this._searchApiKey = variableManager.get("GOOGLE_API_KEY");
    this._customSearch = variableManager.get("CUSTOM_SEARCH");
    this._client = client;
  }

  async downloadMafiaData(): Promise<void> {
    const itemMap = new Map<string, string[]>();
    for (let fileName of ["equipment", "spleenhit", "fullness", "inebriety"]) {
      const file = await axios(
        `https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/${fileName}.txt?format=raw`
      );
      for (let line of file.data.split(/\n/)) {
        try {
          const item = line.split("\t");
          if (item.length > 1) itemMap.set(cleanString(item[0]).toLowerCase(), item);
        } catch {}
      }
    }
    const skillFile = await axios(
      "https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/classskills.txt?format=raw"
    );
    for (let line of skillFile.data.split(/\n/)) {
      try {
        const skill = new Skill(line);
        if (skill.name()) {
          this._thingMap.set(skill.name(), skill);
        }
      } catch {}
    }
    const itemFile = await axios(
      "https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/items.txt?format=raw"
    );
    for (let line of itemFile.data.split(/\n/)) {
      try {
        const item = new Item(line, itemMap);
        if (item.name()) {
          this._thingMap.set(item.name(), item);
        }
      } catch (error) {}
    }

    const monsterFile = await axios(
      "https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/monsters.txt?format=raw"
    );
    for (let line of monsterFile.data.split(/\n/)) {
      try {
        const monster = new Monster(line);
        if (monster.name()) {
          this._thingMap.set(monster.name(), monster);
        }
      } catch {}
    }

    const familiarFile = await axios(
      "https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/familiars.txt?format=raw"
    );
    for (let line of familiarFile.data.split(/\n/)) {
      try {
        const familiar = new Familiar(line);
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
    const effectsFile = await axios(
      "https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/statuseffects.txt?format=raw"
    );
    for (let line of effectsFile.data.split(/\n/)) {
      try {
        const effect = new Effect(line);
        if (effect.name()) {
          this._thingMap.set(effect.name(), effect);
        }
      } catch {}
    }
  }

  async reloadMafiaData(): Promise<void> {
    this._thingMap.clear();
    this.downloadMafiaData();
  }

  async getEmbed(item: string): Promise<MessageEmbed | undefined> {
    const foundName = await this.findName(item);
    if (!foundName) return undefined;
    const embed = new MessageEmbed()
      .setTitle(foundName.name)
      .setURL(foundName.url)
      .setFooter(
        "Problems? Message Phillammon#2824 on discord.",
        "http://images.kingdomofloathing.com/itemimages/oaf.gif"
      );
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
