import { VariableManager } from "./variables";
import get from "axios";


export class ItemFinder {
    private _nameMap: Map<string, string> = new Map();
    private _searchApiKey: string;
    private _customSearch: string;

    constructor(variableManager: VariableManager) {
        this._searchApiKey = variableManager.get("GOOGLE_API_KEY") || "";
        this._customSearch = variableManager.get("CUSTOM_SEARCH") || "";
    }

    async findName(searchTerm: string): Promise<string | undefined> {
        const searchTermCrushed = searchTerm.replace(" ", "_").replace(/[^A-Za-z0-9_\-:\/]/g, '');
        if (this._nameMap.has(searchTermCrushed)) return this._nameMap.get(searchTermCrushed);
        try {
            const wikiResponse = await get(`http://kol.coldfront.net/thekolwiki/index.php?search=${searchTermCrushed}`);
            return(wikiResponse.request.res.responseUrl);
        }
        catch {}
        return undefined;
    }
}