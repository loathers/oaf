import { decode } from "html-entities";

export function indent(textToIndent: string): string {
  return `${decode("&nbsp;&nbsp;&nbsp;​&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")}${textToIndent.replace(
    /\n/g,
    decode("\n​&nbsp;&nbsp;&nbsp;​&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
  )}`;
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
  return `https://www.koldb.com/player.php?name=${encodeURI(input)}`;
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
