import svgToPng from "convert-svg-to-png";
import type { Converter } from "convert-svg-to-png";

let timeout: NodeJS.Timeout | null = null;
let converter: Converter | null = null;

export async function renderSvg(svg: string) {
  if (converter === null) {
    converter = svgToPng.createConverter({ puppeteer: { args: [] } });

    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      converter?.destroy();
      timeout = null;
    }, 60 * 1000);
  }

  return await converter.convert(svg);
}
