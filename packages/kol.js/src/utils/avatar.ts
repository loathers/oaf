import { selectAll, selectOne } from "css-select";
import { parseDocument } from "htmlparser2";
import { Element } from "domhandler";
import { imageSize } from "image-size";
import { dedent } from "ts-dedent";

import { resolveKoLImage } from "./utils.js";

export async function generateAvatarSvg(profile: string) {
  const header = profile.match(
    /<center><table><tr><td><center>.*?(<div.*?>.*?<\/div>).*?<b>([^>]*?)<\/b> \(#(\d+)\)<br>/,
  );
  const blockHtml = header?.[1];

  if (!blockHtml) return null;

  const document = parseDocument(blockHtml);
  const block = selectOne("div", document) as Element | null;

  if (!block) return null;

  const ocrsColour =
    ["gold", "red"].find((k) => block.attribs.class.includes(k)) ?? "black";

  const images = [];

  for (const imgElement of selectAll("img", block)) {
    const src = imgElement.attribs.src;
    if (!src) continue;

    let name = src;
    let result = await fetch(resolveKoLImage(src));
    let replaced = false;

    if (!result.ok) {
      // If this is some decoration that failed, just skip it
      if (images.length > 0) continue;
      // Otherwise let's use nopic
      name = "/adventureimages/nopic.gif";
      result = await fetch(resolveKoLImage(name));
      replaced = true;
    }

    const buffer = Buffer.from(await result.arrayBuffer());

    const { width = 0, height = 0 } = !replaced
      ? imageSize(buffer)
      : { width: 60, height: 100 };

    const href = `data:image/png;base64,${buffer.toString("base64")}`;

    const style = imgElement.attribs.style;

    const top = Number(style?.match(/top: ?(-?\d+)px/i)?.[1] || "0");
    const left = Number(style?.match(/left: ?(-?\d+)px/i)?.[1] || "0");
    const rotate = Number(style?.match(/rotate\((-?\d+)deg\)/)?.[1] || "0");

    images.push({
      name,
      href,
      top,
      left,
      rotate,
      width,
      height,
    });
  }

  const width = Math.max(...images.map((i) => i.left + i.width));

  return dedent`
    <svg width="${width}" height="100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="colorMask">
          <feComponentTransfer in="SourceGraphic" out="f1">
            <feFuncR type="discrete" tableValues="1 0"/>
            <feFuncG type="discrete" tableValues="1 0"/>
            <feFuncB type="discrete" tableValues="1 0"/>
          </feComponentTransfer>
          <feColorMatrix type="matrix" values="1 0 0 0 0
                                              0 1 0 0 0
                                              0 0 1 0 0
                                              1 1 1 1 -3" result="selectedColor"/>
          <feFlood flood-color="${ocrsColour}"/>
          <feComposite operator="in" in2="selectedColor"/>
          <feComposite operator="over" in2="SourceGraphic"/>
        </filter>
      </defs>
      ${images
        .map(
          (i) =>
            dedent`
              <image
                title="${i.name}"
                filter="url(#colorMask)"
                href="${i.href}"
                width="${i.width}"
                height="${i.height}"
                x="${i.left}"
                y="${i.top}"
                transform="rotate(${i.rotate},${i.width / 2 + i.left},${
                  i.height / 2 + i.top
                })"
              />
            `,
        )
        .join("\n")}
    </svg>
  `;
}
