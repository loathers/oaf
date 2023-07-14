import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import sharp from "sharp";

export const data = new SlashCommandBuilder()
  .setName("messiah")
  .setDescription(
    "Let someone know their actions caused you to lose faith in humanity a little bit",
  )
  .addStringOption((option) =>
    option.setName("name").setDescription("the person who ruined your day").setRequired(true),
  );

const superhero = (text: string) => {
  const encoded = text.replace(
    /[&<>'"]/g,
    (t) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[t] || t,
  );

  const skew = 0.261799;
  const width = text.length * 16; // total guess
  const height = Math.ceil(width * Math.tan(skew)); // cool maths
  // temporarily swapping out impact, the right font, for verdana to see what happens
  return `
      <svg viewBox="0 0 ${width + 5} ${height * 1.1}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="superhero" x1="0" x2="0" y1="0" y2="100%">
            <stop stop-color="#fdea00" offset="0%" />
            <stop stop-color="#fdcf00" offset="44%" />
            <stop stop-color="#fc2700" offset="100%" />
          </linearGradient>
        </defs>
        <style>
          .superhero {
            transform: skew(0, -${skew}rad) scale(1, 1.5);
            font-weight: bold;
            font-family: Verdana; 
            font-size: 2em;
            fill: url(#superhero);
          }
        </style>
        <text x="4" y="60%" class="superhero">${encoded}</text>
      </svg>
    `;
};

export async function execute(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);
  const image = superhero(`jesus christ ${name}`);
  const png = await sharp(Buffer.from(image)).png().toBuffer();
  const attachment = new AttachmentBuilder(png).setName("jesuschrist.png");
  interaction.reply({ files: [attachment] });
}
