import { parse as parseDate } from "date-fns";
import { decodeHTML } from "entities";

export function parsePlayerDate(input?: string) {
  if (!input) return new Date();
  return parseDate(input, "MMMM dd, yyyy", new Date());
}

export function sanitiseBlueText(blueText: string | undefined): string {
  if (!blueText) return "";
  return decodeHTML(
    blueText
      .replace(/\r/g, "")
      .replace(/\r/g, "")
      .replace(/(<p><\/p>)|(<br>)|(<Br>)|(<br \/>)|(<Br \/>)/g, "\n")
      .replace(/<[^<>]+>/g, "")
      .replace(/(\n+)/g, "\n")
      .replace(/(\n)+$/, ""),
  ).trim();
}

export function resolveKoLImage(path: string) {
  if (!/^https?:\/\//i.test(path))
    return (
      "https://s3.amazonaws.com/images.kingdomofloathing.com" +
      path.replace(/^\/(iii|images)/, "")
    );
  return path;
}

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const RESISTANCE_ADJECTIVES: Record<number, string> = {
  [-9]: "Total",
  [-7]: "Terrible",
  [-5]: "Troubling",
  [-4]: "Tragic",
  [-3]: "Threatening",
  [-2]: "Trifling",
  [-1]: "Trivial",
  1: "Slight",
  2: "So-So",
  3: "Serious",
  4: "Stupendous",
  5: "Superhuman",
  6: "Superb",
  7: "Stunning",
  8: "Supreme",
  9: "Sublime",
};

export function getElementalResistanceAdjective(level: number): string {
  return RESISTANCE_ADJECTIVES[level] ?? "Unknown";
}

/** Strip HTML tags and decode entities from KoL output. */
export function cleanString(input: string | undefined): string {
  if (!input) return "";
  return decodeHTML(input).replace(/<[^>]+>/g, "");
}

/** Build a URL to the KoL wiki for a given page name. */
export function toWikiLink(input: string): string {
  return `https://wiki.kingdomofloathing.com/${encodeURI(
    input.replace(/\s/g, "_"),
  )
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")}`;
}

/** Parse a KoL-formatted number (with comma separators). */
export function parseKoLNumber(input?: string): number {
  return parseInt(input?.replaceAll(",", "") || "0");
}
