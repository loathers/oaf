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
  return `https://kol.coldfront.net/thekolwiki/index.php/${input.replace(/\s/g, "_")}`;
}
