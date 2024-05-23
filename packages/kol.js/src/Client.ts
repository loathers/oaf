import { Mutex } from "async-mutex";
import { EventEmitter } from "node:events";
import TypedEventEmitter, { EventMap } from "typed-emitter";

import { sanitiseBlueText, wait } from "./utils/utils.js";
import { Player } from "./Player.js";
import { createBody, createSession, formatQuerystring } from "./utils/visit.js";
import { parseLeaderboard } from "./utils/leaderboard.js";
import {
  KoLChatMessage,
  KoLKmail,
  KoLMessage,
  isValidMessage,
} from "./utils/kmail.js";
import { PlayerCache } from "./Cache.js";

type TypedEmitter<T extends EventMap> = TypedEventEmitter.default<T>;

type FetchOptions<Result> = {
  params?: Record<string, string | number>;
  body?: Record<string, string | number>;
  method?: "POST" | "GET";
  fallback?: Result;
};

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

export class Client extends (EventEmitter as new () => TypedEmitter<Events>) {
  loginMutex = new Mutex();
  actionMutex = new Mutex();
  session = createSession();
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

  async #fetch(path: string, options: FetchOptions<any> = {}) {
    const { params, body, method } = {
      params: {},
      body: undefined,
      method: "POST",
      ...options,
    };
    const qs = formatQuerystring({ ...params, pwd: this.#pwd });
    return await this.session(
      `https://www.kingdomofloathing.com/${path}${qs ? `?${qs}` : ""}`,
      {
        method,
        body: body ? createBody({ ...body, pwd: this.#pwd }) : undefined,
      },
    );
  }

  async fetchText(path: string, options: FetchOptions<string> = {}) {
    if (!(await this.login())) return options.fallback ?? "";
    return (await this.#fetch(path, options)).text();
  }

  async fetchJson<Result>(path: string, options: FetchOptions<Result> = {}) {
    if (!(await this.login())) return options.fallback ?? null;
    return (await this.#fetch(path, options)).json() as Result;
  }

  async login(): Promise<boolean> {
    if (this.#isRollover) return false;

    return this.loginMutex.runExclusive(async () => {
      if (await this.checkLoggedIn()) return true;
      if (this.#isRollover) return false;
      try {
        const response = await this.#fetch("login.php", {
          body: {
            loggingin: "Yup.",
            loginname: this.#username,
            password: this.#password,
            secure: "0",
            submitbutton: "Log In",
          },
        });

        await response.text();

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
    });
  }

  isRollover() {
    return this.#isRollover;
  }

  async checkLoggedIn(): Promise<boolean> {
    try {
      const response = await this.#fetch("api.php", {
        params: { what: "status", for: `${this.#username} bot` },
      });
      const api = (await response.json()) as { pwd: string };
      this.#pwd = api.pwd;
      return true;
    } catch (error) {
      return false;
    }
  }

  async #checkForRollover() {
    const isRollover =
      /The system is currently down for nightly maintenance/.test(
        await this.fetchText("/"),
      );

    if (this.#isRollover && !isRollover) {
      // Set the post-rollover latch so the bot can react on next log in.
      this.postRolloverLatch = true;
    }

    this.#isRollover = isRollover;

    if (this.#isRollover) {
      // Rollover appears to be in progress. Check again in one minute.
      setTimeout(() => this.#checkForRollover(), 60000);
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
      params: {
        j: 1,
        lasttime: this.lastFetchedMessages,
      },
    });

    if (!newChatMessagesResponse || typeof newChatMessagesResponse !== "object")
      return;

    this.lastFetchedMessages = newChatMessagesResponse["last"];

    newChatMessagesResponse["msgs"]
      .filter(isValidMessage)
      .map((msg) => ({
        type: msg.type,
        who: new Player(this, Number(msg.who.id), msg.who.name),
        msg: msg.msg,
        time: new Date(Number(msg.time) * 1000),
      }))
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

  async checkKmails() {
    const newKmailsResponse = await this.fetchJson<KoLKmail[]>("api.php", {
      params: {
        what: "kmail",
        for: `${this.#username} bot`,
      },
    });

    if (!Array.isArray(newKmailsResponse) || newKmailsResponse.length === 0)
      return;

    const newKmails = newKmailsResponse.map((msg: KoLKmail) => ({
      type: "kmail" as const,
      who: new Player(this, Number(msg.fromid), msg.fromname),
      msg: msg.message,
      time: new Date(Number(msg.azunixtime) * 1000),
    }));

    const data = {
      the_action: "delete",
      box: "Inbox",
      ...Object.fromEntries(
        newKmailsResponse.map(({ id }) => [`sel${id}`, "on"]),
      ),
    };

    await this.fetchText("messages.php", { params: data });

    newKmails.forEach((m) => this.emit("kmail", m));
  }

  async sendChat(message: string) {
    return await this.fetchJson<{ output: string; msgs: string[] }>(
      "submitnewchat.php",
      {
        params: {
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
      params: {
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
      params: {
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
      ? (minPrice === unlimitedPrice
          ? unlimitedMatch?.[1]
          : limitedMatch?.[1]) ?? ""
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
      params: {
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
      params: {
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
      params: {
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
      params: {
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
        params: {
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
      params: {
        floor: 1,
        place: "leaderboards",
        whichboard: leaderboardId,
      },
    });

    return parseLeaderboard(page);
  }

  async useFamiliar(familiarId: number): Promise<boolean> {
    const result = await this.fetchText("familiar.php", {
      params: {
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
}
