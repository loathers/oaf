import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, MessageAttachment } from "discord.js";

import { Command } from "../type";

import sharp = require("sharp");

const superhero = (text: string) => {
  const skew = 0.261799;
  const width = text.length * 16; // total guess
  const height = Math.ceil(width * Math.tan(skew)); // cool maths
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
            font-family: Impact;
            font-size: 2em;
            fill: url(#superhero);
          }
        </style>
        <text x="4" y="60%" class="superhero">${text}</text>
      </svg>
    `;
};

async function messiahCommand(interaction: CommandInteraction) {
  const name = interaction.options.getString("name");
  const image = superhero(`jesus christ ${name}`);
  const png = await sharp(Buffer.from(image)).png().toBuffer();
  const attachment = new MessageAttachment(png, "jesuschrist.png");
  interaction.reply({ files: [attachment] });
}

const command: Command = {
  attach: ({ discordClient }) =>
    discordClient.attachCommand(
      "messiah",
      [
        {
          name: "name",
          description: "the person who ruined you day",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      messiahCommand,
      "Let someone know their actions caused you to lose faith in humanity a little bit"
    ),
};

export default command;
