import { Mutex } from "async-mutex";
import Emittery from "emittery";
import makeFetchCookie from "fetch-cookie";
import { ofetch } from "ofetch";
import { CookieJar } from "tough-cookie";
import type { Dispatcher } from "undici";

import { ChatMailbox, type ChatMessage } from "./domains/ChatMailbox.js";
import { KmailMailbox, type KmailMessage } from "./domains/KmailMailbox.js";
import { Players } from "./domains/Players.js";
import pkg from "../package.json" with { type: "json" };
import { deduplicate } from "./utils/deduplicate.js";
import { sanitiseBlueText, wait } from "./utils/utils.js";

export type MallPrice = {
  formattedMallPrice: string;
  formattedLimitedMallPrice: string;
  formattedMinPrice: string;
  mallPrice: number;
  limitedMallPrice: number;
  minPrice: number | null;
};

import { AuthError, RolloverError } from "./errors.js";

class LoginRedirectError extends Error {}

type FormData = Record<string, string | number | boolean>;

type RequestOptions = {
  method?: string;
  query?: Record<string, unknown>;
  form?: FormData;
};

function formToBody(form: FormData): URLSearchParams {
  return new URLSearchParams(
    Object.entries(form).map(([k, v]) => [k, String(v)]),
  );
}

type Events = {
  kmail: KmailMessage;
  whisper: ChatMessage;
  system: ChatMessage;
  public: ChatMessage;
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
  protected get baseURL() {
    return "https://www.kingdomofloathing.com";
  }

  protected get dispatcher(): Dispatcher | undefined {
    return undefined;
  }

  session = ofetch.create(
    {
      retry: 0,
      headers: { "user-agent": `kol.js/${pkg.version}` },
      onRequest: ({ options }) => {
        options.baseURL = this.baseURL;
        options.dispatcher = this.dispatcher;
        if (options.query) {
          const { pwd: _, ...rest } = options.query;
          options.query = { ...rest, pwd: this.#pwd };
        }
        if (options.body instanceof URLSearchParams) {
          options.body.set("pwd", this.#pwd);
        }
      },
      onResponse: ({ request, response }) => {
        const requestUrl = typeof request === "string" ? request : request.url;
        if (this.#isRollover) {
          console.log(
            `[rollover] response: ${requestUrl} → ${response.status} ${response.url} body=${JSON.stringify(response._data)}`,
          );
        }
        if (response.url.includes("/maint.php")) {
          console.log(
            `[rollover] redirect to maint.php detected for ${requestUrl}, body=${JSON.stringify(response._data)}`,
          );
          this.#isRollover = true;
          throw new RolloverError();
        }
        if (
          !requestUrl.includes("login.php") &&
          response.url.includes("/login.php")
        ) {
          console.log(
            `[rollover] redirect to login.php detected for ${requestUrl}, body=${JSON.stringify(response._data)}`,
          );
          throw new LoginRedirectError();
        }
      },
    },
    { fetch: makeFetchCookie(fetch, this.#cookieJar) },
  );
  players = new Players(this);
  chat = new ChatMailbox(this);
  kmail = new KmailMailbox(this);

  #username: string;
  #password: string;
  #isRollover = false;
  #chatBotStarted = false;
  #pwd = "";

  constructor(username: string, password: string) {
    super();
    this.#username = username;
    this.#password = password;
  }

  get username() {
    return this.#username;
  }

  async #withRecovery<T>(fn: () => Promise<T>): Promise<T> {
    if (this.#isRollover) await this.#waitForRolloverEnd();

    if (!this.#pwd && !(await this.login())) {
      if (this.#isRollover) {
        await this.#waitForRolloverEnd();
        if (!(await this.login())) throw new AuthError();
      } else {
        throw new AuthError();
      }
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof RolloverError) {
          await this.#waitForRolloverEnd();
          if (!(await this.login())) throw new AuthError();
          continue;
        }
        if (error instanceof LoginRedirectError && attempt === 0) {
          this.#pwd = "";
          if (!(await this.login())) {
            if (this.#isRollover) {
              await this.#waitForRolloverEnd();
              if (!(await this.login())) throw new AuthError();
            } else {
              throw new AuthError();
            }
          }
          continue;
        }
        throw error;
      }
    }

    throw new AuthError();
  }

  async fetchText(path: string, options: RequestOptions = {}): Promise<string> {
    const { form, ...rest } = options;
    return this.#withRecovery(() =>
      this.session(path, {
        method: "POST",
        ...rest,
        body: form ? formToBody(form) : undefined,
        responseType: "text",
      }),
    );
  }

  async fetchJson<Result>(
    path: string,
    options: RequestOptions = {},
  ): Promise<Result> {
    const { form, ...rest } = options;
    return this.#withRecovery(() =>
      this.session<Result>(path, {
        ...rest,
        body: form ? formToBody(form) : undefined,
        responseType: "json",
      }),
    );
  }

  @deduplicate
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

      if (!(await this.checkLoggedIn())) return false;

      return true;
    } catch (error) {
      if (error instanceof RolloverError) return false;
      console.error("Login failed:", error);
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

  @deduplicate
  async #waitForRolloverEnd(): Promise<void> {
    this.#isRollover = true;
    while (this.#isRollover) {
      await wait(this.rolloverCheckInterval);
      try {
        // If this succeeds without a maint.php redirect, rollover is over.
        // The onResponse hook throws RolloverError on maint.php redirect.
        await this.session("login.php", { responseType: "text" });
        this.#isRollover = false;
        console.log("[rollover] Recovery detected, emitting rollover event");
        await this.emit("rollover", new Date());
      } catch {
        // maint.php redirect or server unreachable — stay in rollover
      }
    }
  }

  protected get pollInterval() {
    return 3000;
  }

  protected get rolloverCheckInterval() {
    return 60_000;
  }

  #abortController: AbortController | null = null;

  async startChatBot() {
    if (this.#chatBotStarted) return;
    this.#chatBotStarted = true;
    this.#abortController = new AbortController();
    this.on("rollover", () => void this.#joinChat());
    await this.#joinChat();
    this.#loopChatBot().catch((error) => {
      console.error("Chat bot stopped:", error);
    });
  }

  stopChatBot() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#chatBotStarted = false;
  }

  async #joinChat() {
    try {
      await this.chat.macro("/join talkie");
    } catch (error) {
      console.error("Failed to join chat:", error);
    }
  }

  async #loopChatBot() {
    while (this.#abortController && !this.#abortController.signal.aborted) {
      try {
        await Promise.all([this.chat.check(), this.kmail.check()]);
      } catch (error) {
        if (error instanceof AuthError) throw error;
        if (error instanceof RolloverError) {
          await this.#waitForRolloverEnd();
          continue;
        }
        console.error("Chat bot loop error:", error);
      }
      await wait(this.pollInterval);
    }
  }

  async fetchStatus(): Promise<ApiStatus> {
    return this.fetchJson<ApiStatus>("api.php", {
      query: { what: "status", for: `${this.#username} bot` },
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
            name: effect.groups?.effect,
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
