import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { dedent } from "ts-dedent";

import { resolveKoLImage } from "../../clients/kol.js";
import { renderSvg } from "../../svgConverter.js";
import { bufferToDataUri } from "../../utils.js";

export const data = new SlashCommandBuilder()
  .setName("mug")
  .setDescription("MUGGO IS LIT")
  .addStringOption((option) =>
    option
      .setName("first")
      .setDescription("Contents of the first line")
      .setMaxLength(6),
  )
  .addStringOption((option) =>
    option
      .setName("second")
      .setDescription("Contents of the second line")
      .setMaxLength(6),
  )
  .addStringOption((option) =>
    option
      .setName("third")
      .setDescription("Contents of the third line")
      .setMaxLength(6),
  );

const CHARACTER_IMAGES = [
  "space",
  "exclamation",
  "doublequote",
  "poundsign",
  "dollarsign",
  undefined,
  "ampersand",
  "singlequote",
  "leftparen",
  "rightparen",
  "asterisk",
  "plussign",
  "comma",
  "hyphen",
  "period",
  "slash",
]
  .concat(
    Array(10)
      .fill("")
      .map((_, i) => String.fromCharCode(i + 48)),
  )
  .concat([
    "colon",
    "semicolon",
    "lessthan",
    "equals",
    "greaterthan",
    "question",
    "atsign",
  ])
  .concat(
    Array(26)
      .fill("")
      .map((_, i) => String.fromCharCode(i + 97)),
  )
  .concat([undefined, "backslash", undefined, "caret", "underscore"])
  .map((i) => (i ? `letters/${i}` : undefined));

let _letters: (Buffer | undefined)[] | null = null;

async function getLetters() {
  if (!_letters) {
    _letters = await Promise.all(
      CHARACTER_IMAGES.map((p) =>
        p
          ? fetch(resolveKoLImage(`/otherimages/${p}.gif`))
              .then((r) => r.arrayBuffer())
              .then((b) => Buffer.from(b))
          : undefined,
      ),
    );
  }

  return _letters;
}

const MUG = bufferToDataUri(
  readFileSync(
    path.join(url.fileURLToPath(new URL(".", import.meta.url)), "cup.png"),
  ),
);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const first = interaction.options.getString("first", false) || "";
  const second = interaction.options.getString("second", false) || "";
  const third = interaction.options.getString("third", false) || "";

  const letters = await getLetters();

  const images = [first, second, third]
    .map((line) =>
      [...line.toUpperCase()]
        .map((c) => c.charCodeAt(0) - 32)
        .map((c) => letters[c] || letters[0]!),
    )
    .flatMap((line, lineNumber) => {
      const top = 50 + lineNumber * 30;
      const left = 67 - Math.floor((line.length * 20) / 2);
      return line.map((char, charNumber) => ({
        href: bufferToDataUri(char),
        top,
        left: left + charNumber * 20,
      }));
    });

  if (images.length === 0) {
    return void (await interaction.reply({
      content:
        "A personalized coffee mug with no message is like a skunk with no bad smells. It just don't make sense.",
      ephemeral: true,
    }));
  }

  const svg = dedent`
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="200" height="180">
      <image href="${MUG}"/>
      ${images.map(
        (i) => `<image href="${i.href}" x="${i.left}" y=${i.top} />`,
      )}
    </svg>
  `;

  const image = await renderSvg(svg);

  const attachment = new AttachmentBuilder(image).setName(
    `${[first, second, third].join(" ")}.png`,
  );

  await interaction.editReply({ files: [attachment] });
}
