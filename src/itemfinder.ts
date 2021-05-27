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
        try {
            const wikiResponse = await get(`http://kol.coldfront.net/thekolwiki/index.php?search=${encodeURI(searchTermCrushed)}`);
            const responseUrl = String(wikiResponse.request.res.responseUrl);
            if (responseUrl.indexOf("index.php?search=") < 0) return responseUrl;
        }
        catch {}
        return undefined;
    }
}