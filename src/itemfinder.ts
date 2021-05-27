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
        if (!searchTerm.length) return "You didn't give me anything to search for."
        const searchTermCrushed = searchTerm.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
        if (this._nameMap.has(searchTermCrushed)) return this._nameMap.get(searchTermCrushed);
        const wikiName = searchTerm.replace(/\s/g, "_");
        const wikiSearchName = searchTerm.replace(/\s/g, "+");
        console.log("Trying precise wiki page");
        try {
            const directWikiResponse = await get(`https://kol.coldfront.net/thekolwiki/index.php/${wikiName}`);
            const directResponseUrl = String(directWikiResponse.request.res.responseUrl);
            if (directResponseUrl.indexOf("index.php?search=") < 0) return directResponseUrl;
        }
        catch (error) {console.log(error.toString())}
        console.log("Not found as wiki page");
        console.log("Trying wiki search");
        try {
            const wikiSearchResponse = await get(`https://kol.coldfront.net/thekolwiki/index.php?search=${wikiSearchName}`);
            const searchResponseUrl = String(wikiSearchResponse.request.res.responseUrl);
            if (searchResponseUrl.indexOf("index.php?search=") < 0) return searchResponseUrl;
        }
        catch (error) {console.log(error.toString())}
        console.log("Not found in wiki search");
        console.log("Trying google search");
        try {
            const googleSearchResponse = await get(`https://www.googleapis.com/customsearch/v1`, {
                params: {
                    key: this._searchApiKey,
                    cx: this._customSearch,
                    q: searchTerm,
                }
            });
            return(googleSearchResponse.data.items[0].formattedUrl);
        }
        catch (error) {console.log(error.toString())}
        console.log("Google search stumped, I give up");
        return undefined;
    }
}