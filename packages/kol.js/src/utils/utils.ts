import { parse as parseDate } from "date-fns";
import { decode } from "html-entities";

export function parsePlayerDate(input?: string) {
  if (!input) return new Date();
  return parseDate(input, "MMMM dd, yyyy", new Date());
}

export function sanitiseBlueText(blueText: string | undefined): string {
  if (!blueText) return "";
  return decode(
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
