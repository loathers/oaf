import { StatusCodes } from "http-status-codes";
import { Memoize } from "typescript-memoize";
import { Agent, fetch } from "undici";

import { config } from "../config.js";
import { googleSearch } from "./googleSearch.js";

const insecureAgent = new Agent({
  connect: {
    ciphers: "DEFAULT:@SECLEVEL=1",
  },
});

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

  private async tryWiki(url: string, stage: string) {
    const response = await fetch(url, { dispatcher: insecureAgent });

    if (!response.ok) {
      if (response.status === StatusCodes.NOT_FOUND) return null;
      throw new WikiSearchError(`kolwiki ${stage}`, url);
    }

    const data = await response.text();
    if (!response.url.includes("index.php?search=")) {
      return await this.parseFoundName(response.url, data);
    }

    return null;
  }

  private async tryPreciseWikiPage(searchTerm: string) {
    const wikiName = encodeURIComponent(searchTerm).replace(/\s/g, "_");
    return await this.tryWiki(
      `https://wiki.kingdomofloathing.com/${wikiName}`,
      "precise",
    );
  }

  private async tryWikiSearch(searchTerm: string) {
    const wikiSearchName = encodeURIComponent(searchTerm).replace(/%20/g, "+");
    return await this.tryWiki(
      `https://wiki.kingdomofloathing.com/index.php?search=${wikiSearchName}`,
      "search",
    );
  }

  private async tryStrippedWikiSearch(searchTerm: string) {
    const wikiSearchNameCrushed = searchTerm
      .replace(/[^A-Za-z0-9\s]/g, "")
      .toLowerCase()
      .replace(/\s/g, "+");

    return await this.tryWiki(
      `https://wiki.kingdomofloathing.com/index.php?search=${wikiSearchNameCrushed}`,
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
    return this.parseFoundName(results.items[0].link);
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

  async parseFoundName(url: string, contents?: string) {
    if (!contents)
      contents =
        (await (await fetch(url, { dispatcher: insecureAgent })).text()) || "";
    const name = this.nameFromWikiPage(url, contents);
    const image = this.imageFromWikiPage(url, contents);
    return { name, url, image };
  }

  nameFromWikiPage(url: string, data: string): string {
    //Mediawiki redirects are unreliable, so we can't just read off the url, so we do this horrible thing instead.
    const titleMatch = String(data).match(
      /<h1 id="firstHeading" class="firstHeading mw-first-heading">\s*<span class="mw-page-title-main">(?<pageTitle>.+)<\/span><\/h1>/,
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

  imageFromWikiPage(url: string, data: string): string {
    // As far as I know this is always the first relevant image
    const imageMatch = String(data).match(
      /https:\/\/kol.coldfront.net\/thekolwiki\/images\/[^"']*\.gif/,
    );
    return imageMatch ? imageMatch[0] : "";
  }
}

export const wikiClient = new WikiClient(config.CUSTOM_SEARCH);
