import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import * as path from "node:path";
import * as url from "node:url";
import sharp from "sharp";

export const data = new SlashCommandBuilder()
  .setName("mug")
  .setDescription("MUGGO IS LIT")
  .addStringOption((option) =>
    option.setName("first").setDescription("Contents of the first line").setMaxLength(6),
  )
  .addStringOption((option) =>
    option.setName("second").setDescription("Contents of the second line").setMaxLength(6),
  )
  .addStringOption((option) =>
    option.setName("third").setDescription("Contents of the third line").setMaxLength(6),
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
  .concat(["colon", "semicolon", "lessthan", "equals", "greaterthan", "question", "atsign"])
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
          ? fetch(`http://images.kingdomofloathing.com/otherimages/${p}.gif`)
              .then((r) => r.arrayBuffer())
              .then((b) => Buffer.from(b))
          : undefined,
      ),
    );
  }

  return _letters;
}

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export async function execute(interaction: ChatInputCommandInteraction) {
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
        input: char,
        top,
        left: left + charNumber * 20,
      }));
    });

  if (images.length === 0) {
    return await interaction.reply({
      content:
        "A personalized coffee mug with no message is like a skunk with no bad smells. It just don't make sense.",
      ephemeral: true,
    });
  }

  const png = await sharp(path.join(__dirname, "cup.png")).composite(images).png().toBuffer();

  const attachment = new AttachmentBuilder(png).setName(`${[first, second, third].join(" ")}.png`);
  interaction.reply({ files: [attachment] });
}
