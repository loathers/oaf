import { Player } from "../Player.js";

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

export type KoLMessage = {
  type: KoLMessageType;
  who: Player<false>;
  msg: string;
  time: Date;
  channel?: string;
};
