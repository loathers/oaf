import { VariableManager } from "./variables";
import axios from "axios";
import { MessageEmbed } from "discord.js";
import { Effect, Familiar, Item, Skill, Thing } from "./things";
import { KOLClient } from "./kolclient";

type FoundName = {
    name: string,
    url: string,
}

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
        const effectsFile = await axios("https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/statuseffects.txt?format=raw");
        for (let line of effectsFile.data.split(/\n/)) {
            try {
                const effect = new Effect(line);
                if (effect.name() && !this._thingMap.has(effect.name())) {
                    this._thingMap.set(effect.name(), effect)
                }
            } catch {}
        }
        const skillFile = await axios("https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/classskills.txt?format=raw");
        for (let line of skillFile.data.split(/\n/)) {
            try {
                const skill = new Skill(line);
                if (skill.name() && !this._thingMap.has(skill.name())) {
                    this._thingMap.set(skill.name(), skill)
                }
            } catch {}
        }
        const familiarFile = await axios("https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/familiars.txt?format=raw");
        for (let line of familiarFile.data.split(/\n/)) {
            try {
                const familiar = new Familiar(line);
                if (familiar.name() && !this._thingMap.has(familiar.name())) {
                    this._thingMap.set(familiar.name(), familiar)
                }
            } catch {}
        }
        const itemFile = await axios("https://sourceforge.net/p/kolmafia/code/HEAD/tree/src/data/items.txt?format=raw");
        for (let line of itemFile.data.split(/\n/)) {
            try {
                const item = new Item(line);
                if (item.name() && !this._thingMap.has(item.name())) {
                    this._thingMap.set(item.name(), item)
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
            )
        if (this._thingMap.has(foundName.name.toLowerCase())) {
            const thing = this._thingMap.get(foundName.name.toLowerCase());
            await thing?.addToEmbed(embed, this._client);
        }
        return embed 
    }

    async findName(searchTerm: string): Promise<FoundName | undefined> {
        if (!searchTerm.length) return undefined;
        const searchTermCrushed = searchTerm.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        if (this._nameMap.has(searchTermCrushed)) return this._nameMap.get(searchTermCrushed);
        const wikiName = searchTerm.replace(/\s/g, "_");
        const wikiSearchName = searchTerm.replace(/\s/g, "+");
        console.log("Trying precise wiki page");
        try {
            const directWikiResponse = await axios(`https://kol.coldfront.net/thekolwiki/index.php/${wikiName}`);
            const directResponseUrl = String(directWikiResponse.request.res.responseUrl);
            if (directResponseUrl.indexOf("index.php?search=") < 0) {
                const name = WikiSearcher.nameFromWikiPage( directResponseUrl, directWikiResponse.data)
                this._nameMap.set(searchTermCrushed, {name: name, url: directResponseUrl})
                return this._nameMap.get(searchTermCrushed);
            }
        }
        catch (error) {console.log(error.toString())}
        console.log("Not found as wiki page");
        console.log("Trying wiki search");
        try {
            const wikiSearchResponse = await axios(`https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchName}`);
            const searchResponseUrl = String(wikiSearchResponse.request.res.responseUrl);
            if (searchResponseUrl.indexOf("index.php?search=") < 0) {
                const name = WikiSearcher.nameFromWikiPage(searchResponseUrl, wikiSearchResponse.data)
                this._nameMap.set(searchTermCrushed, {name: name, url: searchResponseUrl})
                return this._nameMap.get(searchTermCrushed);
            }
        }
        catch (error) {console.log(error.toString())}
        console.log("Not found in wiki search");
        console.log("Trying google search");
        try {
            const googleSearchResponse = await axios(`https://www.googleapis.com/customsearch/v1`, {
                params: {
                    key: this._searchApiKey,
                    cx: this._customSearch,
                    q: searchTerm,
                }
            });
            const name = WikiSearcher.nameFromWikiPage(googleSearchResponse.data.items[0].link, "")
            console.log(name)
            this._nameMap.set(searchTermCrushed, {name: name, url: googleSearchResponse.data.items[0].link})
            return this._nameMap.get(searchTermCrushed);
        }
        catch (error) {console.log(error.toString())}
        console.log("Google search stumped, I give up");
        return undefined;
    }

    static nameFromWikiPage(url: string, data: any): string {
        //Mediawiki redirects are unreliable, so we can't just read off the url, so we do this horrible thing instead.
        const titleMatch = String(data).match(/\<h1 id="firstHeading" class="firstHeading" lang="en">\s*<span dir="auto">(?<pageTitle>.+)<\/span><\/h1>/);
        let result = "";
        if (titleMatch?.groups && titleMatch.groups.pageTitle) {
            result = titleMatch.groups.pageTitle;
        } else result = decodeURIComponent(url.split("/index.php/")[1]).replace(/\_/g, " ");
        if (result.endsWith(" (item)")) result.replace(" (item)", "");
        if (result.endsWith(" (skill)")) result.replace(" (skill)", "");
        if (result.endsWith(" (effect)")) result.replace(" (effect)", "");
        if (result.endsWith(" (familiar)")) result.replace(" (familiar)", "");
        switch (result.toLowerCase()) {
            case "glitch season reward name": return "[glitch season reward name]";
            default: return result;
        }
    }
}