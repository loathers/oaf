import { createConverter } from "convert-svg-to-png";
import { executablePath } from "puppeteer";

let timeout: ReturnType<typeof setTimeout> | null = null;
let converter: Awaited<ReturnType<typeof createConverter>> | null = null;

export async function renderSvg(svg: string) {
  if (converter === null || converter.closed) {
    converter = await createConverter({
      launch: {
        executablePath,
        args: ["--no-sandbox"],
      },
    });

    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      converter?.close();
      timeout = null;
    }, 60000);
  }

  return await converter.convert(svg);
}
