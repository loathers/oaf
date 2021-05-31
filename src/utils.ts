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
