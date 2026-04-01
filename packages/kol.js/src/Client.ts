import { Mutex } from "async-mutex";
import Emittery from "emittery";
import makeFetchCookie from "fetch-cookie";
import { ofetch } from "ofetch";
import { CookieJar } from "tough-cookie";

import { Player } from "./Player.js";
import { Players } from "./domains/Players.js";
import {
  type ChatMessage,
  type KmailMessage,
  type KoLChatMessage,
  type KoLKmail,
  type KoLMessage,
  isValidMessage,
  parseKmailMessage,
} from "./utils/kmail.js";
import pkg from "../package.json" with { type: "json" };
import { sanitiseBlueText, wait } from "./utils/utils.js";

export type MallPrice = {
  formattedMallPrice: string;
  formattedLimitedMallPrice: string;
  formattedMinPrice: string;
  mallPrice: number;
  limitedMallPrice: number;
  minPrice: number | null;
};

class LoginRedirectError extends Error {}

type RequestOptions = {
  method?: string;
  query?: Record<string, unknown>;
  form?: Record<string, unknown>;
};

function formToBody(form: Record<string, unknown>): URLSearchParams {
  return new URLSearchParams(
    Object.entries(form).map(([k, v]) => [k, String(v)]),
  );
}

type Events = {
  kmail: KmailMessage;
  whisper: KoLMessage;
  system: KoLMessage;
  public: KoLMessage;
  rollover: Date;
};

type Familiar = {
  id: number;
  name: string;
  image: string;
};

type ApiStatus = {
  /** number of ascensions */
  ascensions: string;
  /** number of turns played */
  turnsplayed: string;
  /** kol game day number */
  daynumber: string;
  /** player level */
  level: string;
  /** session password */
  pwd: string;
};

export class Client extends Emittery<Events> {
  actionMutex = new Mutex();
  #cookieJar = new CookieJar();
  session = ofetch.create(
    {
      baseURL: "https://www.kingdomofloathing.com",
      retry: 0,
      headers: { "user-agent": `kol.js/${pkg.version}` },
      onRequest: ({ options }) => {
        if (options.query) {
          const { pwd: _, ...rest } = options.query;
          options.query = { ...rest, pwd: this.#pwd };
        }
        if (options.body instanceof URLSearchParams) {
          options.body.set("pwd", this.#pwd);
        }
      },
      onResponse: ({ request, response }) => {
        if (
          !String(request).includes("login.php") &&
          response.url.includes("/login.php")
        ) {
          throw new LoginRedirectError();
        }
      },
    },
    { fetch: makeFetchCookie(fetch, this.#cookieJar) },
  );
  players = new Players(this);

  #username: string;
  #password: string;
  #isRollover = false;
  #chatBotStarted = false;
  #pwd = "";

  private lastFetchedMessages = "0";
  private postRolloverLatch = false;

  constructor(username: string, password: string) {
    super();
    this.#username = username;
    this.#password = password;
  }

  get username() {
    return this.#username;
  }

  async fetchText(
    path: string,
    options: RequestOptions = {},
    fallback?: string,
  ): Promise<string> {
    // With no pwd, try to log in
    if (!this.#pwd && !(await this.login())) return fallback ?? "";

    const { form, ...rest } = options;

    try {
      return await this.session(path, {
        method: "POST",
        ...rest,
        body: form ? formToBody(form) : undefined,
        responseType: "text",
      });
    } catch (error) {
      if (!(error instanceof LoginRedirectError)) throw error;
      this.#pwd = "";
      return this.fetchText(path, options);
    }
  }

  async fetchJson<Result>(
    path: string,
    options: RequestOptions = {},
    fallback?: Result,
  ): Promise<Result | null> {
    if (!(await this.login())) return fallback ?? null;

    const { form, ...rest } = options;

    try {
      return await this.session<Result>(path, {
        ...rest,
        body: form ? formToBody(form) : undefined,
        responseType: "json",
      });
    } catch (error) {
      if (error instanceof LoginRedirectError) {
        this.#pwd = "";
        return this.fetchJson(path, options);
      }
      return fallback ?? null;
    }
  }

  async login(): Promise<boolean> {
    if (await this.checkLoggedIn()) return true;
    if (this.#isRollover) return false;
    try {
      const result = await this.session("login.php", {
        method: "POST",
        responseType: "text",
        body: formToBody({
          loggingin: "Yup.",
          loginname: this.#username,
          password: this.#password,
          secure: "0",
          submitbutton: "Log In",
        }),
      });

      if (Client.#rolloverPattern.test(result)) {
        throw new Error("It's rollover!");
      }

      if (!(await this.checkLoggedIn())) return false;

      if (this.postRolloverLatch) {
        this.postRolloverLatch = false;
        this.emit("rollover", new Date());
      }

      return true;
    } catch (error) {
      console.log("error", error);
      // Login failed, let's check if it is due to rollover
      await this.#checkForRollover();
      return false;
    }
  }

  isRollover() {
    return this.#isRollover;
  }

  async checkLoggedIn(): Promise<boolean> {
    try {
      const api = await this.session<{ pwd: string }>("api.php", {
        query: { what: "status", for: `${this.#username} bot` },
      });
      if (!api || typeof api !== "object" || !api.pwd) return false;
      this.#pwd = api.pwd;
      return true;
    } catch {
      return false;
    }
  }

  static #rolloverPattern =
    /The system is currently down for nightly maintenance/;

  async #checkForRollover() {
    const isRollover = Client.#rolloverPattern.test(await this.fetchText(""));

    if (this.#isRollover && !isRollover) {
      // Set the post-rollover latch so the bot can react on next log in.
      this.postRolloverLatch = true;
    }

    this.#isRollover = isRollover;

    if (this.#isRollover) {
      // Rollover appears to be in progress. Check again in one minute.
      setTimeout(() => this.#checkForRollover(), 60_000);
    }
  }

  async startChatBot() {
    if (this.#chatBotStarted) return;
    await this.useChatMacro("/join talkie");
    this.loopChatBot();
    this.#chatBotStarted = true;
  }

  private async loopChatBot() {
    await Promise.all([this.checkMessages(), this.checkKmails()]);
    await wait(3000);
    await this.loopChatBot();
  }

  async checkMessages() {
    const newChatMessagesResponse = await this.fetchJson<{
      last: string;
      msgs: KoLChatMessage[];
    }>("newchatmessages.php", {
      query: {
        j: 1,
        lasttime: this.lastFetchedMessages,
      },
    });

    if (!newChatMessagesResponse || typeof newChatMessagesResponse !== "object")
      return;

    this.lastFetchedMessages = newChatMessagesResponse["last"];

    newChatMessagesResponse["msgs"]
      .filter(isValidMessage)
      .map(
        (msg): ChatMessage => ({
          type: msg.type as ChatMessage["type"],
          who: new Player(this, Number(msg.who.id), msg.who.name),
          msg: msg.msg,
          time: new Date(Number(msg.time) * 1000),
        }),
      )
      .forEach((message) => {
        switch (message.type) {
          case "public":
            return void this.emit("public", message);
          case "private":
            return void this.emit("whisper", message);
          case "system":
            return void this.emit("system", message);
        }
      });
  }

  async fetchStatus(): Promise<ApiStatus | null> {
    const api = await this.fetchJson<ApiStatus>("api.php", {
      query: { what: "status", for: `${this.#username} bot` },
    });

    return api;
  }

  async fetchKmails(): Promise<KmailMessage[]> {
    const kmails = await this.fetchJson<KoLKmail[]>("api.php", {
      query: {
        what: "kmail",
        for: `${this.#username} bot`,
      },
    });

    if (!Array.isArray(kmails) || kmails.length === 0) return [];

    return kmails.map((msg: KoLKmail) => ({
      id: Number(msg.id),
      type: "kmail" as const,
      who: new Player(this, Number(msg.fromid), msg.fromname),
      time: new Date(Number(msg.azunixtime) * 1000),
      ...parseKmailMessage(msg.message, msg.type),
    }));
  }

  async deleteKmails(ids: number[]) {
    if (ids.length === 0) return true;

    const response = await this.fetchText("messages.php", {
      form: {
        the_action: "delete",
        box: "Inbox",
        ...Object.fromEntries(ids.map((id) => [`sel${id}`, "on"])),
      },
    });

    return response.includes(
      `<td>${ids.length} message${ids.length === 1 ? "" : "s"} deleted.</td>`,
    );
  }

  async checkKmails() {
    const kmails = await this.fetchKmails();
    await this.deleteKmails(kmails.map((k) => k.id));
    kmails.forEach((m) => this.emit("kmail", m));
  }

  async sendChat(message: string) {
    return await this.fetchJson<{ output: string; msgs: string[] }>(
      "submitnewchat.php",
      {
        query: {
          graf: message,
          j: 1,
        },
      },
    );
  }

  async getUpdates() {
    const result = await this.sendChat("/updates");
    return [
      ...(result?.output.matchAll(
        /<p><b>[A-za-z]+ \d+<\/b> - (.*?)(?=<p>(?:<b>|<hr>))/g,
      ) ?? []),
    ].map((m) => m[1]);
  }

  async useChatMacro(macro: string) {
    return await this.sendChat(`/clan ${macro}`);
  }

  async whisper(recipientId: number, message: string) {
    await this.useChatMacro(`/w ${recipientId} ${message}`);
  }

  async kmail(recipientId: number, message: string) {
    await this.fetchText("sendmessage.php", {
      query: {
        action: "send",
        j: 1,
        towho: recipientId,
        contact: 0,
        message: message,
        howmany1: 1,
        whichitem1: 0,
        sendmeat: 0,
      },
    });
  }

  async getMallPrice(itemId: number): Promise<MallPrice> {
    const prices = await this.fetchText("backoffice.php", {
      query: {
        action: "prices",
        ajax: 1,
        iid: itemId,
      },
    });
    const unlimitedMatch = prices.match(
      /<td>unlimited:<\/td><td><b>(?<unlimitedPrice>[\d,]+)/,
    );
    const limitedMatch = prices.match(
      /<td>limited:<\/td><td><b>(?<limitedPrice>[\d,]+)/,
    );
    const unlimitedPrice = unlimitedMatch
      ? parseInt(unlimitedMatch[1].replace(/,/g, ""))
      : 0;
    const limitedPrice = limitedMatch
      ? parseInt(limitedMatch[1].replace(/,/g, ""))
      : 0;
    let minPrice = limitedMatch ? limitedPrice : null;
    minPrice = unlimitedMatch
      ? !minPrice || unlimitedPrice < minPrice
        ? unlimitedPrice
        : minPrice
      : minPrice;
    const formattedMinPrice = minPrice
      ? ((minPrice === unlimitedPrice
          ? unlimitedMatch?.[1]
          : limitedMatch?.[1]) ?? "")
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

  async getItemDescription(descId: number): Promise<{
    melting: boolean;
    singleEquip: boolean;
    blueText: string;
    effect?: {
      name: string;
      duration: number;
      descid: string;
    };
  }> {
    const description = await this.fetchText("desc_item.php", {
      query: { whichitem: descId },
    });
    const blueText = description.match(
      /<center>\s*<b>\s*<font color="?[\w]+"?>(?<description>[\s\S]+)<\/center>/i,
    );
    const effect = description.match(
      /Effect: \s?<b>\s?<a[^>]+href="desc_effect\.php\?whicheffect=(?<descid>[^"]+)[^>]+>(?<effect>[\s\S]+)<\/a>[^(]+\((?<duration>[\d]+)/,
    );
    const melting = description.match(
      /This item will disappear at the end of the day\./,
    );
    const singleEquip = description.match(
      / You may not equip more than one of these at a time\./,
    );

    return {
      melting: !!melting,
      singleEquip: !!singleEquip,
      blueText: sanitiseBlueText(blueText?.groups?.description),
      effect: effect?.groups
        ? {
            name: effect.groups?.name,
            duration: Number(effect.groups?.duration) || 0,
            descid: effect.groups?.descid,
          }
        : undefined,
    };
  }

  async getEffectDescription(descId: string): Promise<{ blueText: string }> {
    const description = await this.fetchText("desc_effect.php", {
      query: { whicheffect: descId },
    });
    const blueText = description.match(
      /<center><font color="?[\w]+"?>(?<description>[\s\S]+)<\/div>/m,
    );
    return { blueText: sanitiseBlueText(blueText?.groups?.description) };
  }

  async getSkillDescription(id: number): Promise<{ blueText: string }> {
    const description = await this.fetchText("desc_skill.php", {
      query: { whichskill: String(id) },
    });

    const blueText = description.match(
      /<blockquote[\s\S]+<[Cc]enter>(?<description>[\s\S]+)<\/[Cc]enter>/,
    );
    return { blueText: sanitiseBlueText(blueText?.groups?.description) };
  }

  async joinClan(id: number): Promise<boolean> {
    const result = await this.fetchText("showclan.php", {
      query: {
        whichclan: id,
        action: "joinclan",
        confirm: "on",
      },
    });
    return (
      result.includes("clanhalltop.gif") ||
      result.includes("a clan you're already in")
    );
  }

  async addToWhitelist(playerId: number, clanId: number): Promise<boolean> {
    return await this.actionMutex.runExclusive(async () => {
      if (!(await this.joinClan(clanId))) return false;
      await this.fetchText("clan_whitelist.php", {
        query: {
          addwho: playerId,
          level: 2,
          title: "",
          action: "add",
        },
      });
      return true;
    });
  }

  async useFamiliar(familiarId: number): Promise<boolean> {
    const result = await this.fetchText("familiar.php", {
      query: {
        action: "newfam",
        newfam: familiarId.toFixed(0),
      },
    });

    return result.includes(`var currentfam = ${familiarId};`);
  }

  async getFamiliars(): Promise<Familiar[]> {
    const terrarium = await this.fetchText("familiar.php");
    const matches = terrarium.matchAll(
      /onClick='fam\((\d+)\)'(?:><img)? src=".*?\/(\w+\/\w+.(?:gif|png))".*?\d+-pound (.*?) \(/g,
    );
    const familiars = [...matches].map((m) => ({
      id: Number(m[1]),
      image: m[2],
      name: m[3],
    }));

    if (terrarium.includes("fam(278)")) {
      familiars.push({
        id: 278,
        image: "otherimages/righthandbody.png",
        name: "Left-Hand Man",
      });
    }

    return familiars;
  }

  static #descIdToIdCache: Map<number, number> = new Map();

  async descIdToId(descId: number): Promise<number> {
    if (Client.#descIdToIdCache.has(descId))
      return Client.#descIdToIdCache.get(descId)!;
    const page = await this.fetchText("desc_item.php", {
      query: { whichitem: descId },
    });
    const id = Number(page.match(/<!-- itemid: (\d+) -->/)?.[1] ?? -1);
    Client.#descIdToIdCache.set(descId, id);
    return id;
  }

  async getStandard(date?: Date) {
    if (!date) {
      date = new Date();
      date.setFullYear(date.getFullYear() - 2);
      date.setMonth(0);
      date.setDate(2);
    }

    const formattedDate = date.toISOString().split("T")[0];

    return await this.fetchText("standard.php", {
      query: { date: formattedDate },
    });
  }
}
