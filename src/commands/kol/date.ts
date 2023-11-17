import svgToPng from "convert-svg-to-png";
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
} from "discord.js";
import { dedent } from "ts-dedent";

import { LoathingDate } from "../../clients/LoathingDate.js";

export const data = new SlashCommandBuilder()
  .setName("date")
  .setDescription("Get the current date and moon phases in KoL");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const date = new LoathingDate();

  const file = await svgToPng.convert(date.getMoonsAsSvg(), {
    puppeteer: { args: ["--no-sandbox"] },
  });

  const attachment = new AttachmentBuilder(file).setName(
    `moons-${date.toShortString()}.png`,
  );

  return await interaction.editReply({
    content: dedent`
            Right now, in the Kingdom of Loathing it is ${bold(date.toString())}
            ${date.getMoonDescription()}
        `,
    files: [attachment],
  });
}
