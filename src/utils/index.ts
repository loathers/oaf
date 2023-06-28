import { Player } from "@prisma/client";
import { APIEmbedField, hyperlink, userMention } from "discord.js";
import { decode } from "html-entities";

export function indent(textToIndent: string): string {
  return textToIndent
    .split("\n")
    .map((l) => `${"\u00A0".repeat(8)}${l}`)
    .join("\n");
}

export function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export function cleanString(input: string | undefined): string {
  if (!input) return "";
  return decode(input).replace(/<[^>]+>/g, "");
}

export function toWikiLink(input: string): string {
  return `https://kol.coldfront.net/thekolwiki/index.php/${encodeURI(input.replace(/\s/g, "_"))
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")}`;
}

export function toKoldbLink(input: string): string {
  // NOTE: KOLDB does not support https. If this ever changes, this should change too.
  return `http://www.koldb.com/player.php?name=${encodeURI(input)}`;
}

export function toMuseumLink(id: number): string {
  return `https://museum.loathers.net/player/${id}`;
}

export function parseNumber(input?: string): number {
  return parseInt(input?.replace(",", "") || "0");
}

export function clamp(num: number, min: number, max: number): number {
  return num <= min ? min : num >= max ? max : num;
}

export const toDrop = (weight: number, power = 1) =>
  Math.sqrt(55 * (weight * power)) + weight * power - 3;

export const toWeight = (modifier: number, power = 1) =>
  (2 * modifier + 61 - Math.sqrt(220 * modifier + 3685)) / (2 * power);

export const lf = new Intl.ListFormat("en");

export const pluralize = (count: number, singular: string, plural?: string) =>
  count.toLocaleString() + " " + (count === 1 ? singular : plural || singular + "s");

export function groupToMap<K, V>(
  array: V[],
  callbackFn: (element: V, index?: number, array?: V[]) => K
) {
  const map = new Map<K, V[]>();
  for (let i = 0; i < array.length; i++) {
    const key = callbackFn(array[i], i, array);
    if (!map.has(key)) map.set(key, [] as V[]);
    map.get(key)!.push(array[i]);
  }
  return map;
}

export function columns<T extends { toString: () => string }>(
  data: T[],
  columns: number
): APIEmbedField[] {
  return Array(columns)
    .fill(0)
    .map((_, i) => ({
      name: "\u200b",
      value:
        "\u200b" +
        data
          .slice(Math.ceil(i * (data.length / 3)), Math.ceil((i + 1) * (data.length / 3)))
          .join("\n"),
      inline: true,
    }));
}

export function columnsByMaxLength<T extends { toString: () => string }>(
  data: T[],
  maxLength = 1024
) {
  const columns = [];

  let column = "";
  for (const datum of data) {
    const str = datum.toString();
    if (column.length + str.length >= maxLength) {
      console.log(column.length, str, str.length);
      columns.push(column.slice(0, -1));
      column = "";
    }
    column += str + "\n";
  }

  if (column.length > 0) {
    columns.push(column);
  }

  return columns.map((col) => ({
    name: "\u200b",
    value: "\u200b" + col,
  }));
}

export function titleCase(title: string) {
  return title
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatPlayer(player: Player | undefined, backupId?: number) {
  const discordId = player?.discordId;
  return discordId
    ? `${userMention(discordId)}${hyperlink(
        "👤",
        `https://www.kingdomofloathing.com/showplayer.php?who=${player.playerId}`,
        player.playerName
      )}`
    : player?.playerName || `Player #${backupId}` || "Unknown player";
}
