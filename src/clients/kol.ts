import { Mutex } from "async-mutex";
import axios from "axios";
import { bold, hyperlink } from "discord.js";
import { decode } from "html-entities";
import { DOMParser } from "xmldom";
import { select } from "xpath";

import { cleanString, indent, toWikiLink } from "../utils";

const parser = new DOMParser({
  locator: {},
  errorHandler: {
    warning: function (w) {},
    error: function (e) {},
    fatalError: function (e) {
      console.error(e);
    },
  },
});

type MallPrice = {
  formattedMallPrice: string;
  formattedLimitedMallPrice: string;
  formattedMinPrice: string;
  mallPrice: number;
  limitedMallPrice: number;
  minPrice: number | null;
};

type KOLCredentials = {
  fetched: number;
  sessionCookies?: string;
  pwdhash?: string;
};

export type LeaderboardInfo = {
  name: string;
  boards: SubboardInfo[];
};

export type SubboardInfo = {
  name: string;
  runs: RunInfo[];
};

type RunInfo = {
  player: string;
  days: string;
  turns: string;
};

type PartialPlayer = {
  id: number;
  name: string;
  level: number;
  class: string;
};

type FullPlayer = {
  ascensions: number;
  trophies: number;
  tattoos: number;
  favoriteFood: string;
  favoriteBooze: string;
  lastLogin: string;
  hasDisplayCase: boolean;
};

function sanitiseBlueText(blueText: string | undefined): string {
  if (!blueText) return "";
  return decode(
    blueText
      .replace(/\r/g, "")
      .replace(/\r/g, "")
      .replace(/(<p><\/p>)|(<br>)|(<Br>)|(<br \/>)|(<Br \/>)/g, "\n")
      .replace(/<[^<>]+>/g, "")
      .replace(/(\n+)/g, "\n")
      .replace(/(\n)+$/, "")
  );
}

export class KoLClient {
  clanActionMutex = new Mutex();
  static loginMutex = new Mutex();
  private _loginParameters: URLSearchParams;
  private _credentials: KOLCredentials = { fetched: -1 };

  constructor(username: string, password: string) {
    this._loginParameters = new URLSearchParams();
    this._loginParameters.append("loggingin", "Yup.");
    this._loginParameters.append("loginname", username);
    this._loginParameters.append("password", password);
    this._loginParameters.append("secure", "0");
    this._loginParameters.append("submitbutton", "Log In");
  }

  async logIn(): Promise<void> {
    await KoLClient.loginMutex.runExclusive(async () => {
      try {
        if (this._credentials.fetched < new Date().getTime() - 60000) {
          const loginResponse = await axios("https://www.kingdomofloathing.com/login.php", {
            method: "POST",
            data: this._loginParameters,
            maxRedirects: 0,
            validateStatus: (status) => status === 302,
          });
          const sessionCookies = (loginResponse.headers["set-cookie"] || [])
            .map((cookie: string) => cookie.split(";")[0])
            .join("; ");
          const apiResponse = await axios("https://www.kingdomofloathing.com/api.php", {
            withCredentials: true,
            headers: {
              cookie: sessionCookies,
            },
            params: {
              what: "status",
              for: "OAF Discord bot for Kingdom of Loathing",
            },
          });
          this._credentials = {
            fetched: new Date().getTime(),
            sessionCookies: sessionCookies,
            pwdhash: apiResponse.data.pwd,
          };
        } else {
          console.log("Blocked fetching new credentials");
          console.log(
            `${60000 + this._credentials.fetched - new Date().getTime()} milliseconds to new login`
          );
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  private async makeCredentialedRequest(url: string, parameters: object) {
    try {
      const request = await axios.get<string>(`https://www.kingdomofloathing.com/${url}`, {
        method: "GET",
        headers: {
          cookie: this._credentials.sessionCookies || "",
        },
        params: {
          pwd: this._credentials.pwdhash,
          ...parameters,
        },
      });
      if (
        !request.data ||
        request.data.match(/<title>The Kingdom of Loathing<\/title>/) ||
        request.data.match(/This script is not available unless you're logged in\./)
      ) {
        return undefined;
      }
      return request.data;
    } catch {
      return undefined;
    }
  }

  async tryRequestWithLogin(url: string, parameters: object) {
    const result = await this.makeCredentialedRequest(url, parameters);
    if (result) return result;
    await this.logIn();
    return (await this.makeCredentialedRequest(url, parameters)) || "";
  }

  async getMallPrice(itemId: number): Promise<MallPrice> {
    const prices = await this.tryRequestWithLogin("backoffice.php", {
      action: "prices",
      ajax: 1,
      iid: itemId,
    });
    const unlimitedMatch = prices.match(/<td>unlimited:<\/td><td><b>(?<unlimitedPrice>[\d\,]+)/);
    const limitedMatch = prices.match(/<td>limited:<\/td><td><b>(?<limitedPrice>[\d\,]+)/);
    const unlimitedPrice = unlimitedMatch ? parseInt(unlimitedMatch[1].replace(/,/g, "")) : 0;
    const limitedPrice = limitedMatch ? parseInt(limitedMatch[1].replace(/,/g, "")) : 0;
    let minPrice = limitedMatch ? limitedPrice : null;
    minPrice = unlimitedMatch
      ? !minPrice || unlimitedPrice < minPrice
        ? unlimitedPrice
        : minPrice
      : minPrice;
    const formattedMinPrice = minPrice
      ? (minPrice === unlimitedPrice ? unlimitedMatch?.[1] : limitedMatch?.[1]) ?? ""
      : "";
    return {
      mallPrice: unlimitedPrice,
      limitedMallPrice: limitedPrice,
      formattedMinPrice: formattedMinPrice,
      minPrice: minPrice,
      formattedMallPrice: unlimitedMatch ? unlimitedMatch[1] : "",
      formattedLimitedMallPrice: limitedMatch ? limitedMatch[1] : "",
    };
  }

  async getItemDescription(descId: number): Promise<string> {
    switch (descId) {
      // Complicated Device
      case 539406330:
        return "+1, 11, and 111 to a wide array of stats\n";
      default: //fall through
    }
    const description = await this.tryRequestWithLogin("desc_item.php", {
      whichitem: descId,
    });
    const blueText = description.match(
      /<[Cc]enter>\s?<b>\s?<font color="?[\w]+"?>(?<description>[\s\S]+)<\/[Cc]enter>/
    );
    const effect = description.match(
      /Effect: \s?<b>\s?<a[^\>]+href="desc_effect\.php\?whicheffect=(?<descid>[^"]+)[^\>]+>(?<effect>[\s\S]+)<\/a>[^\(]+\((?<duration>[\d]+)/
    );
    const melting = description.match(/This item will disappear at the end of the day\./);
    const singleEquip = description.match(/ You may not equip more than one of these at a time\./);

    const output = [];

    if (melting) output.push("Disappears at rollover");
    if (singleEquip) output.push("Single equip only.");
    if (blueText) output.push(sanitiseBlueText(blueText.groups?.description));
    if (effect)
      output.push(
        `Gives ${effect.groups?.duration} adventures of ${bold(
          hyperlink(
            cleanString(effect.groups?.effect),
            toWikiLink(cleanString(effect.groups?.effect))
          )
        )}\n${indent(await this.getEffectDescription(effect.groups?.descid))}`
      );

    return output.join("\n");
  }

  async getEffectDescription(descId: string | undefined): Promise<string> {
    if (!descId) return "";

    switch (descId) {
      // Video... Games?
      case "3d5280f646ac2a6b70e64eae72daa263":
        return "+5 to basically everything";
      // Spoon Boon
      case "fa4374dcb3f6a5d3ff129b0be374fa1f":
        return "Muscle +10%\nMysticality +10%\nMoxie +10%\n+5 Prismatic Damage\n+10 Prismatic Spell Damage\nSo-So Resistance to All Elements (+2)";
    }

    const description = await this.tryRequestWithLogin("desc_effect.php", {
      whicheffect: descId,
    });

    const blueText = description.match(
      /<center><font color="?[\w]+"?>(?<description>[\s\S]+)<\/div>/
    );

    return sanitiseBlueText(blueText?.groups?.description);
  }

  async getSkillDescription(id: number): Promise<string> {
    const description = await this.tryRequestWithLogin("desc_skill.php", {
      whichskill: String(id),
    });
    const blueText = description.match(
      /<blockquote[\s\S]+<[Cc]enter>(?<description>[\s\S]+)<\/[Cc]enter>/
    );
    return blueText ? sanitiseBlueText(blueText.groups?.description) : "";
  }

  async joinClan(id: number): Promise<boolean> {
    const result = await this.tryRequestWithLogin("showclan.php", {
      whichclan: id,
      action: "joinclan",
      confirm: "on",
    });
    return result.includes("clanhalltop.gif") || result.includes("a clan you're already in");
  }

  async addToWhitelist(playerId: number, clanId: number): Promise<boolean> {
    return await this.clanActionMutex.runExclusive(async () => {
      if (!(await this.joinClan(clanId))) return false;
      await this.tryRequestWithLogin("clan_whitelist.php", {
        addwho: playerId,
        level: 2,
        title: "",
        action: "add",
      });
      return true;
    });
  }

  async getLeaderboard(leaderboardId: number): Promise<LeaderboardInfo | undefined> {
    try {
      const leaderboard = await this.tryRequestWithLogin("museum.php", {
        floor: 1,
        place: "leaderboards",
        whichboard: leaderboardId,
      });

      const document = parser.parseFromString(leaderboard);
      const [board, ...boards] = select("//table", document);

      return {
        name: select(".//text()", (board as Node).firstChild as ChildNode)
          .map((node) => (node as Node).nodeValue)
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
        boards: boards
          .slice(1)
          .filter(
            (board) =>
              (select("./tr//text()", board as Node)[0] as Node)?.nodeValue?.match(
                /^((Fast|Funn|B)est|Most (Goo|Elf))/
              ) && select("./tr", board as Node).length > 1
          )
          .map((subboard) => {
            const rows = select("./tr", subboard as Node);
            return {
              name: ((select(".//text()", rows[0] as Node)[0] as Node)?.nodeValue || "").trim(),
              runs: select("./td//tr", rows[1] as Node)
                .slice(2)
                .map((node) => {
                  const rowText = select(".//text()", node as Node).map((text) =>
                    text.toString().replace(/&amp;nbsp;/g, "")
                  );
                  const hasTwoNumbers = !!parseInt(rowText[rowText.length - 2]);
                  return {
                    player: rowText
                      .slice(0, rowText.length - (hasTwoNumbers ? 2 : 1))
                      .join("")
                      .trim()
                      .toString(),
                    days: hasTwoNumbers ? rowText[rowText.length - 2].toString() || "0" : "",
                    turns: rowText[rowText.length - 1].toString() || "0",
                  };
                }),
            };
          }),
      };
    } catch (error) {
      return undefined;
    }
  }

  async getPartialPlayer(nameOrId: string | number) {
    let id = Number(nameOrId);

    if (!Number.isNaN(id) || typeof nameOrId === "number") {
      return await this.getPartialPlayerFromId(id);
    }

    return await this.getPartialPlayerFromName(nameOrId);
  }

  async getPartialPlayerFromId(id: number): Promise<PartialPlayer | null> {
    try {
      const profile = await this.tryRequestWithLogin("showplayer.php", { who: id });
      const header = profile.match(/<b>([^>]*?)<\/b> \(#(\d+)\)<br>/);
      if (!header) return null;

      const goldstars =
        profile.match(/<img src="\/images\/otherimages\/goldstart.png" height="30" width="30" \/>/g)
          ?.length ?? 0;
      const optimalityMultiplier = 10 ** (goldstars / 2);
      const level = Number(header[2] || "0") / optimalityMultiplier;
      const clss = profile.match(/<b>Class:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? "Unknown";

      return {
        id: id,
        name: header[1],
        level,
        class: clss,
      };
    } catch {
      return null;
    }
  }

  async getPartialPlayerFromName(name: string): Promise<PartialPlayer | null> {
    try {
      const matcher =
        /href="showplayer.php\?who=(?<user_id>\d+)[^<]+\D+(clan=\d+[^<]+\D+)?\d+\D*(?<level>(\d+)|(inf_large\.gif))\D+valign=top>(?<class>[^<]+)\<\/td\>/i;
      const search = await this.tryRequestWithLogin("searchplayer.php", {
        searchstring: name.replace(/\_/g, "\\_"),
        searching: "Yep.",
        for: "",
        startswith: 1,
        hardcoreonly: 0,
      });
      const match = matcher.exec(search)?.groups;

      if (!match) {
        return null;
      }

      return {
        id: Number(match.user_id),
        name,
        level: parseInt(match.level),
        class: match.class,
      };
    } catch (error) {
      return null;
    }
  }

  async ensureFamiliar(familiarId: number): Promise<void> {
    await this.tryRequestWithLogin("familiar.php", {
      action: "newfam",
      newfam: familiarId.toFixed(0),
    });
  }

  async getEquipmentFamiliar(itemId: number): Promise<string | null> {
    const responseText: string = await this.tryRequestWithLogin("inv_equip.php", {
      action: "equip",
      which: 2,
      whichitem: itemId,
    });

    const match = /Only a specific familiar type \(([^\)]*)\) can equip this item/.exec(
      responseText
    );

    return match?.[1] ?? null;
  }

  async getPlayerInformation(id: number): Promise<FullPlayer | null> {
    try {
      const profile = await this.tryRequestWithLogin("showplayer.php", { who: id });
      const header = profile.match(/<b>([^>]*?)<\/b> \(#(\d+)\)<br>/);
      if (!header) return null;
      const ascensions = Number(profile.match(/>Ascensions<\/a>:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? 0);
      const trophies = Number(profile.match(/>Trophies Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? 0);
      const tattoos = Number(profile.match(/>Tattoos Collected:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? 0);
      const favoriteFood = profile.match(/>Favorite Food:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? "toast (probably)";
      const favoriteBooze = profile.match(/>Favorite Booze:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? "cold butter (probably)";
      const lastLogin = profile.match(/>Last Login:<\/b><\/td><td>(.*?)<\/td>/)?.[1] ?? "a date between now and February 10th, 2003";
      const hasDisplayCase = profile.match(/Display Case<\/b><\/a> in the Museum<\/td>/) !== null;


      return {
        ascensions,
        trophies,
        tattoos,
        favoriteFood,
        favoriteBooze,
        lastLogin,
        hasDisplayCase
      };       
    } catch {
      return null;
    }
  }
}
export const kolClient = new KoLClient(process.env.KOL_USER || "", process.env.KOL_PASS || "");
