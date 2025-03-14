import { Mutex } from "async-mutex";
import { EventEmitter } from "node:events";
import TypedEventEmitter, { EventMap } from "typed-emitter";

import { sanitiseBlueText, wait } from "./utils/utils.js";
import { Player } from "./Player.js";
import { parseLeaderboard } from "./utils/leaderboard.js";
import {
  ChatMessage,
  KmailMessage,
  KoLChatMessage,
  KoLKmail,
  KoLMessage,
  isValidMessage,
} from "./utils/kmail.js";
import { PlayerCache } from "./Cache.js";
import { CookieJar } from "tough-cookie";
import got, { OptionsOfJSONResponseBody, OptionsOfTextResponseBody } from "got";

type TypedEmitter<T extends EventMap> = TypedEventEmitter.default<T>;

type MallPrice = {
  formattedMallPrice: string;
  formattedLimitedMallPrice: string;
  formattedMinPrice: string;
  mallPrice: number;
  limitedMallPrice: number;
  minPrice: number | null;
};

type Events = {
  kmail: (message: KoLMessage) => void;
  whisper: (message: KoLMessage) => void;
  system: (message: KoLMessage) => void;
  public: (message: KoLMessage) => void;
  rollover: () => void;
};

type Familiar = {
  id: number;
  name: string;
  image: string;
};

export class Client extends (EventEmitter as unknown as new () => TypedEmitter<Events>) {
  actionMutex = new Mutex();
  session = got.extend({
    cookieJar: new CookieJar(),
    prefixUrl: "https://www.kingdomofloathing.com",
    handlers: [
      (options, next) => {
        if (options.form) {
          if (options.form.pwd !== false) options.form.pwd = this.#pwd;
        }

        if (options.searchParams) {
          const searchParams = options.searchParams as URLSearchParams;
          if (searchParams.get("pwd") !== "false")
            searchParams.set("pwd", this.#pwd);
        }

        return next(options);
      },
    ],
  });
  players = new PlayerCache(this);

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
    options: OptionsOfTextResponseBody = {},
    fallback?: string,
  ): Promise<string> {
    // With no pwd, try to log in
    if (!this.#pwd && !(await this.login())) return fallback ?? "";

    // Make the request
    const response = await this.session(path, {
      method: "POST",
      ...options,
      responseType: "text",
    });

    // If we've been redirected to the login page, clear the pwd and try again
    if (response.url.includes("/login.php")) {
      this.#pwd = "";
      return this.fetchText(path, options);
    }

    return response.body;
  }

  async fetchJson<Result>(
    path: string,
    options: OptionsOfJSONResponseBody = {},
    fallback?: Result,
  ): Promise<Result | null> {
    if (!(await this.login())) return fallback ?? null;

    let failed = false;

    // Make the request
    try {
      const response = await this.session(path, {
        ...options,
        responseType: "json",
      });
      if (!response.url.includes("/login.php")) return response.body as Result;
    } catch (error) {}

    // If we've not been successful, clear the pwd and try again
    this.#pwd = "";
    return this.fetchJson(path, options);
  }

  async login(): Promise<boolean> {
    if (await this.checkLoggedIn()) return true;
    if (this.#isRollover) return false;
    try {
      const result = await this.session
        .post("login.php", {
          form: {
            loggingin: "Yup.",
            loginname: this.#username,
            password: this.#password,
            secure: "0",
            submitbutton: "Log In",
          },
        })
        .text();

      if (Client.#rolloverPattern.test(result)) {
        throw new Error("It's rollover!")
      }

      if (!(await this.checkLoggedIn())) return false;

      if (this.postRolloverLatch) {
        this.postRolloverLatch = false;
        this.emit("rollover");
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
      const api = await this.session
        .get("api.php", {
          searchParams: { what: "status", for: `${this.#username} bot` },
        })
        .json<{ pwd: string }>();
      this.#pwd = api.pwd;
      return true;
    } catch (error) {
      return false;
    }
  }

  static #rolloverPattern = /The system is currently down for nightly maintenance/;

  async #checkForRollover() {
    const isRollover =
      Client.#rolloverPattern.test(
        await this.fetchText("/"),
      );

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
      searchParams: {
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

  async fetchKmails(): Promise<KmailMessage[]> {
    const kmails = await this.fetchJson<KoLKmail[]>("api.php", {
      searchParams: {
        what: "kmail",
        for: `${this.#username} bot`,
      },
    });

    if (!Array.isArray(kmails) || kmails.length === 0) return [];

    return kmails.map((msg: KoLKmail) => ({
      id: Number(msg.id),
      type: "kmail" as const,
      who: new Player(this, Number(msg.fromid), msg.fromname),
      msg: msg.message,
      time: new Date(Number(msg.azunixtime) * 1000),
    }));
  }

  async deleteKmails(ids: number[]) {
    if (ids.length === 0) return true;

    const response = await this.fetchText("messages.php", {
      form: {
        the_action: "delete",
        box: "Inbox",
        ...Object.fromEntries(ids.map((id) => [`sel${id}`, "on"])),
        pwd: true,
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
        searchParams: {
          graf: message,
          j: 1,
        },
      },
    );
  }

  async useChatMacro(macro: string) {
    return await this.sendChat(`/clan ${macro}`);
  }

  async whisper(recipientId: number, message: string) {
    await this.useChatMacro(`/w ${recipientId} ${message}`);
  }

  async kmail(recipientId: number, message: string) {
    await this.fetchText("sendmessage.php", {
      searchParams: {
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
      searchParams: {
        action: "prices",
        pwd: true,
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
      searchParams: {
        whichitem: descId,
      },
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
      searchParams: {
        whicheffect: descId,
      },
    });
    const blueText = description.match(
      /<center><font color="?[\w]+"?>(?<description>[\s\S]+)<\/div>/m,
    );
    return { blueText: sanitiseBlueText(blueText?.groups?.description) };
  }

  async getSkillDescription(id: number): Promise<{ blueText: string }> {
    const description = await this.fetchText("desc_skill.php", {
      searchParams: {
        whichskill: String(id),
      },
    });

    const blueText = description.match(
      /<blockquote[\s\S]+<[Cc]enter>(?<description>[\s\S]+)<\/[Cc]enter>/,
    );
    return { blueText: sanitiseBlueText(blueText?.groups?.description) };
  }

  async joinClan(id: number): Promise<boolean> {
    const result = await this.fetchText("showclan.php", {
      searchParams: {
        whichclan: id,
        action: "joinclan",
        confirm: "on",
        pwd: true,
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
        searchParams: {
          addwho: playerId,
          level: 2,
          title: "",
          action: "add",
        },
      });
      return true;
    });
  }

  async getLeaderboard(leaderboardId: number) {
    const page = await this.fetchText("museum.php", {
      searchParams: {
        floor: 1,
        place: "leaderboards",
        whichboard: leaderboardId,
      },
    });

    return parseLeaderboard(page);
  }

  async useFamiliar(familiarId: number): Promise<boolean> {
    const result = await this.fetchText("familiar.php", {
      searchParams: {
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
      searchParams: {
        whichitem: descId,
      },
    });
    const id = Number(page.match(/<!-- itemid: (\d+) -->/)?.[1] ?? -1);
    Client.#descIdToIdCache.set(descId, id);
    return id;
  }

  async getRaffle() {
    const page = await this.fetchText("raffle.php");
    const today = page.matchAll(
      /<tr><td align=right>(?:First|Second) Prize:<\/td>.*?descitem\((\d+)\)/g,
    );
    const [first, second] = await Promise.all(
      today
        ? [...today].map(async (p) => await this.descIdToId(Number(p[1])))
        : [null, null],
    );
    const winners = page.matchAll(
      /<tr><td class=small><a href='showplayer\.php\?who=\d+'>(.*?) \(#(\d+)\).*?descitem\((\d+)\).*?([\d,]+)<\/td><\/tr>/g,
    );
    const yesterday = await Promise.all(
      winners
        ? [...winners].map(async (w) => ({
            player: new Player(this, Number(w[2]), w[1]),
            item: await this.descIdToId(Number(w[3])),
            tickets: Number(w[4].replace(",", "")),
          }))
        : [],
    );

    return {
      today: { first, second },
      yesterday,
    };
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
      searchParams: { date: formattedDate },
    });
  }
}
