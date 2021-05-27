import { VariableManager } from "./variables";
import get from "axios";
import { urlencoded } from "express";


export class ItemFinder {
    private _nameMap: Map<string, string> = new Map();
    private _searchApiKey: string;
    private _customSearch: string;

    constructor(variableManager: VariableManager) {
        this._searchApiKey = variableManager.get("GOOGLE_API_KEY") || "";
        this._customSearch = variableManager.get("CUSTOM_SEARCH") || "";
    }

    async findName(searchTerm: string): Promise<string | undefined> {
        const searchTermCrushed = searchTerm.replace(/[^A-Za-z0-9_\-:\/\(\)\,\.\!\?\'\%]\s/g, '');
        if (this._nameMap.has(searchTermCrushed)) return this._nameMap.get(searchTermCrushed);
        const wikiName = searchTermCrushed.replace(/\s/g, "_");
        const wikiSearchName = searchTermCrushed.replace(/\s/g, "+");
        console.log(wikiName);
        console.log(wikiSearchName);
        try {
            const directWikiResponse = await get(`https://kol.coldfront.net/thekolwiki/index.php/${wikiName}`);
            const directResponseUrl = String(directWikiResponse.request.res.responseUrl);
            if (directResponseUrl.indexOf("index.php?search=") < 0) return directResponseUrl;
        }
        catch {}
        try {
            const wikiSearchResponse = await get(`https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchName}`);
            const searchResponseUrl = String(wikiSearchResponse.request.res.responseUrl);
            if (searchResponseUrl.indexOf("index.php?search=") < 0) return searchResponseUrl;
        }
        catch {}
        return undefined;
    }
}