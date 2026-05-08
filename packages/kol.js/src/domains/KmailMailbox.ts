import { selectAll, selectOne } from "css-select";
import { type AnyNode, Element } from "domhandler";
import { decodeHTML } from "entities";
import { parseDocument } from "htmlparser2";

import { Item } from "data-of-loathing";
import { gameData } from "../GameData.js";
import { Player } from "../Player.js";
import { type Message, Mailbox } from "./Mailbox.js";

type RawKmailItem = {
  id: number;
  name: string;
  quantity: number;
  descid: string;
};

type RawKmail = {
  id: string;
  type: string;
  fromid: string;
  fromname: string;
  azunixtime: string;
  message: string;
  localtime: string;
};

export interface KmailMessage extends Message {
  type: "kmail";
  id: number;
  kmailType: "normal" | "giftshop";
  valentine: string | null;
  items: Map<Item, number>;
  meat: number;
  insideNote: string | null;
}

function extractItemsFromHtml(html: string): RawKmailItem[] {
  const doc = parseDocument(html);
  const tables = selectAll<AnyNode, Element>("table.item", doc);

  return tables.map((table) => {
    const rel = table.attribs.rel ?? "";
    const params = new URLSearchParams(rel);

    const img = selectOne<AnyNode, Element>("img", table);
    const name = img?.attribs.title ?? "";
    const onClick = img?.attribs.onClick ?? img?.attribs.onclick ?? "";
    const descMatch = onClick.match(/descitem\((\d+)\)/);

    return {
      id: Number(params.get("id") ?? 0),
      name,
      quantity: Number(params.get("n") ?? 1),
      descid: descMatch?.[1] ?? "",
    };
  });
}

function extractMeatFromHtml(html: string): number {
  const match = html.match(/You (?:gain|acquire) ([\d,]+) Meat/);
  if (!match) return 0;
  return Number(match[1].replace(/,/g, ""));
}

export class KmailMailbox extends Mailbox<KmailMessage> {
  static parse(
    rawMessage: string,
    type: string,
  ): {
    msg: string;
    kmailType: "normal" | "giftshop";
    valentine: string | null;
    items: RawKmailItem[];
    meat: number;
    insideNote: string | null;
  } {
    let text = rawMessage;
    let insideText: string | undefined;
    let valentine: string | null = null;
    const kmailType = type as "normal" | "giftshop";

    if (type === "normal") {
      if (text.startsWith("<center><table>")) {
        const endIdx = text.indexOf("</center>");
        const header = text.slice(0, endIdx);
        const imgMatch = header.match(/adventureimages\/(\w+)\.\w+/);
        valentine = imgMatch?.[1] ?? "unknown";
        text = text.slice(endIdx + 9);
      }
    } else if (type === "giftshop") {
      [text, insideText] = text.split("<p>Inside Note:<p>");
    }

    const split = (s: string): [string, string | null] => {
      const idx = s.indexOf("<");
      if (idx === -1) return [s, null];
      return [s.slice(0, idx), s.slice(idx)];
    };

    const [outsideNote, outsideAttachments] = split(text);
    const [insideNote, insideAttachments] =
      insideText !== undefined ? split(insideText) : [null, null];

    const allAttachments = `${outsideAttachments ?? ""}${insideAttachments ?? ""}`;

    return {
      msg: decodeHTML(outsideNote),
      kmailType,
      valentine,
      items: allAttachments ? extractItemsFromHtml(allAttachments) : [],
      meat: allAttachments ? extractMeatFromHtml(allAttachments) : 0,
      insideNote: insideNote !== null ? decodeHTML(insideNote) : null,
    };
  }

  async fetch(): Promise<KmailMessage[]> {
    const kmails = await this.client.fetchJson<RawKmail[]>("api.php", {
      query: {
        what: "kmail",
        for: `${this.client.username} bot`,
      },
    });

    if (!Array.isArray(kmails) || kmails.length === 0) return [];

    return Promise.all(
      kmails.map(async (msg: RawKmail) => {
        const parsed = KmailMailbox.parse(msg.message, msg.type);
        const items = new Map<Item, number>();
        for (const { id, descid, quantity } of parsed.items) {
          const item =
            (await gameData.findItemByDescId(Number(descid))) ??
            (await gameData.findItemById(id));
          if (item) items.set(item, quantity);
        }
        return {
          id: Number(msg.id),
          type: "kmail" as const,
          who: new Player(this.client, Number(msg.fromid), msg.fromname),
          time: new Date(Number(msg.azunixtime) * 1000),
          ...parsed,
          items,
        };
      }),
    );
  }

  async delete(ids: number[]) {
    if (ids.length === 0) return true;

    const response = await this.client.fetchText("messages.php", {
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

  async check() {
    const kmails = await this.fetch();
    await this.delete(kmails.map((k) => k.id));
    for (const m of kmails) await this.client.emit("kmail", m);
  }

  async send(
    recipientId: number,
    message: string,
    options?: {
      items?: Map<Item, number>;
      meat?: number;
    },
  ) {
    const form: Record<string, string | number | boolean> = {
      action: "send",
      j: 1,
      towho: recipientId,
      contact: 0,
      message,
      sendmeat: options?.meat ?? 0,
    };

    let i = 1;
    for (const [item, quantity] of options?.items ?? []) {
      form[`whichitem${i}`] = item.id;
      form[`howmany${i}`] = quantity;
      i++;
    }

    await this.client.fetchText("sendmessage.php", { query: form });
  }
}
