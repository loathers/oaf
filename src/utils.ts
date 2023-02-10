import { decode } from "html-entities";

export function indent(textToIndent: string): string {
  return `${decode("&nbsp;&nbsp;&nbsp;​&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")}${textToIndent.replace(
    /\n/g,
    decode("\n​&nbsp;&nbsp;&nbsp;​&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")
  )}`;
}

export function cleanString(input: string): string {
  return decode(input).replace(/<[^>]+>/g, "");
}

export function toWikiLink(input: string): string {
  return `https://kol.coldfront.net/thekolwiki/index.php/${encodeURI(input.replace(/\s/g, "_"))
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")}`;
}

export function clamp(num: number, min: number, max: number): number {
  return num <= min ? min : num >= max ? max : num;
}

export const toDrop = (weight: number, power = 1) =>
  Math.sqrt(55 * (weight * power)) + weight * power - 3;

export const toWeight = (modifier: number, power = 1) =>
  (2 * modifier + 61 - Math.sqrt(220 * modifier + 3685)) / (2 * power);

export const lf = new Intl.ListFormat("en");
