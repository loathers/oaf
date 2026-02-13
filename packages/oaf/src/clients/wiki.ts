import { Memoize, MemoizeExpiring } from "typescript-memoize";

import { config } from "../config.js";
import { resolveWikiLink } from "../utils.js";

type FoundName = {
  name: string;
  url: string;
  image?: string;
};

function emoteNamesFromEmotes(emoteString: string) {
  return emoteString.replace(/<a?:(?<emote>[a-zA-Z\-_]+):[\d]+>/g, (match) => {
    const emoteName = match.match(/:(?<emote>[a-zA-Z\-_]+):/);
    return emoteName ? emoteName[1].replace(/:/g, "") : "";
  });
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0";

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

/**
 * Client for interacting with and searching the KoL Wiki
 */
export class WikiClient {
  private googleCustomSearch?: string;

  constructor(googleCustomSearch?: string) {
    this.googleCustomSearch = googleCustomSearch;
  }

  /**
   * @param url api.php?action=parse...
   */
  private async parseWiki(url: string) {
    const response = await fetch(url, { headers: { "User-Agent": UA } });

    if (!response.ok) {
      throw new WikiSearchError("kolwiki precise", url);
    }

    const json = (await response.json()) as
      | { error: { code: string } }
      | { parse: { title: string; pageid: number; text: { "*": string } } };
    if ("error" in json) {
      if (json.error.code === "missingtitle") return null;
      throw new WikiSearchError("kolwiki precise");
    }

    const image = this.imageFromWikiPage(json.parse.text["*"]);
    return {
      name: json.parse.title,
      url: `https://wiki.kingdomofloathing.com/Special:Redirect/page/${json.parse.pageid}`,
      image,
    };
  }

  private async tryWikiPage(searchTerm: string) {
    const wikiName = encodeURIComponent(searchTerm).replace(/\s/g, "_");
    return await this.parseWiki(
      `https://wiki.kingdomofloathing.com/api.php?action=parse&page=${wikiName}&prop=text&format=json`,
    );
  }

  private async tryWikiSearch(searchTerm: string, what: "text" | "title") {
    const wikiName = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    const response = await fetch(
      `https://wiki.kingdomofloathing.com/api.php?action=query&list=search&srwhat=${what}&srlimit=1&srsearch=${wikiName}&format=json`,
      { headers: { "User-Agent": UA } },
    );

    if (!response.ok) {
      throw new WikiSearchError(`kolwiki search ${what}`);
    }

    const json = (await response.json()) as
      | { error: { code: string } }
      | {
          query: {
            search: { title: string; pageid: number; text: { "*": string } }[];
          };
        };
    if ("error" in json) {
      throw new WikiSearchError(`kolwiki search ${what}`);
    }

    const result = json.query.search[0];

    if (!result) return null;

    return await this.parseWiki(
      `https://wiki.kingdomofloathing.com/api.php?action=parse&pageid=${result.pageid}&prop=text&format=json`,
    );
  }

  @Memoize()
  async findName(searchTerm: string): Promise<FoundName | null> {
    if (!searchTerm.length) return null;
    const clean = emoteNamesFromEmotes(searchTerm).replace(/\u2019/g, "'");
    return (
      (await this.tryWikiPage(clean)) ||
      (await this.tryWikiSearch(clean, "title")) ||
      (await this.tryWikiSearch(clean, "text"))
      // || (await this.tryGoogleSearch(clean))
    );
  }

  nameFromWikiPage(url: string, data: string): string {
    //Mediawiki redirects are unreliable, so we can't just read off the url, so we do this horrible thing instead.
    const titleMatch = String(data).match(
      /<h1 id="firstHeading" class="firstHeading mw-first-heading">.*?<span class="mw-page-title-main">(?<pageTitle>.+)<\/span><\/h1>/,
    );
    let result = "";
    if (titleMatch?.groups && titleMatch.groups.pageTitle) {
      result = titleMatch.groups.pageTitle;
    } else
      result = decodeURIComponent(url.split("/index.php/")[1]).replace(
        /_/g,
        " ",
      );
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

  imageFromWikiPage(data: string): string {
    // As far as I know this is always the first relevant image
    const imageMatch = String(data).match(/src="(\/images\/[^"']*\.gif)/);
    return imageMatch ? resolveWikiLink(imageMatch[1]) : "";
  }

  @MemoizeExpiring(60 * 60 * 1000) // Cache for 60 minutes
  async getAllPageTitles() {
    const request = {
      action: "query",
      format: "json",
      list: "allpages",
      aplimit: "max",
    };
    const results: string[] = [];
    let lastContinue: Record<string, string> = {};

    while (true) {
      // Clone original request and apply continuation
      const params = new URLSearchParams(
        Object.entries({
          ...request,
          ...lastContinue,
        }).map(([k, v]) => [k, String(v)]),
      );

      const url = `https://wiki.kingdomofloathing.com/api.php?${params.toString()}`;
      const response = await fetch(url, { headers: { "User-Agent": UA } });
      const result = (await response.json()) as {
        query: { allpages: { title: string }[] };
        continue: Record<string, string>;
        error?: string;
        warnings?: string;
      };

      if (result.error) {
        throw new Error(JSON.stringify(result.error));
      }

      if (result.warnings) {
        console.warn(result.warnings);
      }

      if (result.query) {
        results.push(...result.query.allpages.map((p) => p.title));
      }

      if (!result.continue) {
        break;
      }

      lastContinue = result.continue;
    }

    return results;
  }
}

export const wikiClient = new WikiClient(config.CUSTOM_SEARCH);
