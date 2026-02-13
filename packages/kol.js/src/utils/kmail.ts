import { selectAll, selectOne } from "css-select";
import { type AnyNode, Element } from "domhandler";
import { decodeHTML } from "entities";
import { parseDocument } from "htmlparser2";

import { Player } from "../Player.js";

export type KmailItem = {
  id: number;
  name: string;
  quantity: number;
  descid: string;
};

export type KoLChatMessage = {
  who?: Player<false>;
  type?: string;
  msg?: string;
  link?: string;
  channel?: string;
  time: string;
};

type KoLMessageType = "private" | "system" | "public" | "kmail";

export const isValidMessage = (
  msg: KoLChatMessage,
): msg is KoLChatMessage & {
  type: KoLMessageType;
  who: Player<false>;
  msg: string;
} => msg.who !== undefined && msg.msg !== undefined;

export type KoLKmail = {
  id: string;
  type: string;
  fromid: string;
  fromname: string;
  azunixtime: string;
  message: string;
  localtime: string;
};

export type BaseKoLMessage = {
  type: KoLMessageType;
  who: Player<false>;
  msg: string;
  time: Date;
};

export interface KmailMessage extends BaseKoLMessage {
  type: "kmail";
  id: number;
  kmailType: "normal" | "giftshop";
  valentine: string | null;
  items: KmailItem[];
  meat: number;
  insideNote: string | null;
}

function extractItemsFromHtml(html: string): KmailItem[] {
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

export function parseKmailMessage(
  rawMessage: string,
  type: string,
): {
  msg: string;
  kmailType: "normal" | "giftshop";
  valentine: string | null;
  items: KmailItem[];
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

export interface ChatMessage extends BaseKoLMessage {
  type: "public" | "private" | "system";
}

export type KoLMessage = KmailMessage | ChatMessage;
