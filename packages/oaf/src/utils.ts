import { decodeHTML } from "entities";

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
  return decodeHTML(input).replace(/<[^>]+>/g, "");
}

export function toWikiLink(input: string): string {
  return `https://wiki.kingdomofloathing.com/${encodeURI(
    input.replace(/\s/g, "_"),
  )
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")}`;
}

export function resolveWikiLink(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, "https://wiki.kingdomofloathing.com").href;
}

export function toSamsaraLink(id: number): string {
  return `https://samsara.loathers.net/player/${id}`;
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

export const lf = new Intl.ListFormat("en");

export const pluralize = (count: number, singular: string, plural?: string) =>
  count.toLocaleString() +
  " " +
  (count === 1 ? singular : plural || singular + "s");

export function groupToMap<K, V>(
  array: V[],
  callbackFn: (element: V, index?: number, array?: V[]) => K,
) {
  const map = new Map<K, V[]>();
  for (let i = 0; i < array.length; i++) {
    const key = callbackFn(array[i], i, array);
    if (!map.has(key)) map.set(key, [] as V[]);
    map.get(key)!.push(array[i]);
  }
  return map;
}

export function titleCase(title: string) {
  return title
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function ensureArray<T>(v: T | T[]) {
  return Array.isArray(v) ? v : [v];
}

export function englishJoin<T>(v: T[]) {
  return `${v.length > 1 ? `${v.slice(0, -1).join(", ")} and ` : ""}${v.slice(-1).join("")}`;
}

export function bufferToDataUri(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function lowercaseLeadingLetter(str: string): string {
  return `${str[0].toLowerCase()}${str.slice(1)}`;
}

const pendingRetries = new Set<Promise<Response>>();

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
): Promise<Response> {
  const promise = (async () => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fetch(url, init);
      } catch (error) {
        if (attempt === retries - 1) throw error;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }

    throw new Error("Unreachable");
  })();

  pendingRetries.add(promise);
  void promise.finally(() => pendingRetries.delete(promise)).catch(() => {});

  return promise;
}

export async function waitForPendingRetries(): Promise<void> {
  if (pendingRetries.size === 0) return;
  console.log(
    `Waiting for ${pendingRetries.size} pending request(s) to complete...`,
  );
  await Promise.allSettled(pendingRetries);
}
