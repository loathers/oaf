import { VariableManager } from "./variables";
import axios from "axios";
import { decode } from "html-entities";

type MallPrice = {
  formattedMallPrice: string;
  formattedLimitedMallPrice: string;
  mallPrice: number;
  limitedMallPrice: number;
};

type KOLCredentials = {
  sessionCookies?: string;
  pwdhash?: string;
};

export class KOLClient {
  private _loginParameters: URLSearchParams;
  private _credentials: KOLCredentials = {};

  constructor(variableManager: VariableManager) {
    this._loginParameters = new URLSearchParams();
    this._loginParameters.append("loggingin", "Yup.");
    this._loginParameters.append("loginname", variableManager.get("KOL_USER"));
    this._loginParameters.append("password", variableManager.get("KOL_PASS"));
    this._loginParameters.append("secure", "0");
    this._loginParameters.append("submitbutton", "Log In");
  }

  async logIn(): Promise<void> {
    try {
      const loginResponse = await axios("https://www.kingdomofloathing.com/login.php", {
        method: "POST",
        data: this._loginParameters,
        maxRedirects: 0,
        validateStatus: (status) => status === 302,
      });
      const sessionCookies = loginResponse.headers["set-cookie"]
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
        sessionCookies: sessionCookies,
        pwdhash: apiResponse.data.pwd,
      };
    } catch (error) {
      console.log(error);
    }
  }

  private async makeCredentialedRequest(url: string, parameters: object) {
    try {
      const request = await axios(`https://www.kingdomofloathing.com/${url}`, {
        method: "GET",
        headers: {
          cookie: this._credentials.sessionCookies,
        },
        params: {
          pwd: this._credentials.pwdhash,
          ...parameters,
        },
      });
      return request.data;
    } catch {
      return undefined;
    }
  }

  private async tryRequestWithLogin(url: string, parameters: object) {
    const result = await this.makeCredentialedRequest(url, parameters);
    if (result) return result;
    await this.logIn();
    return await this.makeCredentialedRequest(url, parameters);
  }

  async getMallPrice(itemId: number): Promise<MallPrice> {
    const prices = await this.tryRequestWithLogin("backoffice.php", {
      action: "prices",
      ajax: 1,
      iid: itemId,
    });
    const unlimitedMatch = prices.match(/<td>unlimited:<\/td><td><b>(?<unlimitedPrice>[\d\,]+)/);
    const limitedMatch = prices.match(/<td>limited:<\/td><td><b>(?<limitedPrice>[\d\,]+)/);
    return {
      mallPrice: unlimitedMatch ? parseInt(unlimitedMatch[1].replace(/,/g, "")) : 0,
      limitedMallPrice: limitedMatch ? parseInt(limitedMatch[1].replace(/,/g, "")) : 0,
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
    return `${
      blueText ? `${this.sanitiseBlueText(blueText.groups.description)}${effect ? "\n\n" : ""}` : ""
    }${
      effect
        ? `Gives ${effect.groups.duration} adventures of **${decode(
            effect.groups.effect
          )}**:\n${await this.getEffectDescription(effect.groups.descid)}`
        : ""
    }`;
  }

  async getEffectDescription(descId: string): Promise<string> {
    switch (descId) {
      // Video... Games?
      case "3d5280f646ac2a6b70e64eae72daa263":
        return "+5 to basically everything";
      // Spoon Boon
      case "fa4374dcb3f6a5d3ff129b0be374fa1f":
        return "Muscle +10%\nMysticality +10%\nMoxie +10%\n+5 Prismatic Damage\n+10 Prismatic Spell Damage\nSo-So Resistance to All Elements (+2)";
      default: //fall through
    }
    const description = await this.tryRequestWithLogin("desc_effect.php", {
      whicheffect: descId,
    });
    const blueText = description.match(
      /<center><font color="?[\w]+"?>(?<description>[\s\S]+)<\/div>/
    );
    return blueText ? this.sanitiseBlueText(blueText.groups.description) : "";
  }

  async getSkillDescription(id: number): Promise<string> {
    const description = await this.tryRequestWithLogin("desc_skill.php", {
      whichskill: String(id),
    });
    const blueText = description.match(
      /<blockquote[\s\S]+<[Cc]enter>(?<description>[\s\S]+)<\/[Cc]enter>/
    );
    return blueText ? this.sanitiseBlueText(blueText.groups.description) : "";
  }

  private sanitiseBlueText(blueText: string): string {
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
}
