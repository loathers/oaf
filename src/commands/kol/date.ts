import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  bold,
} from "discord.js";
import { dedent } from "ts-dedent";

import { LoathingDate } from "../../clients/LoathingDate.js";
import { renderSvg } from "../../svgConverter.js";

export const data = new SlashCommandBuilder()
  .setName("date")
  .setDescription("Get the current date and moon phases in KoL");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const date = new LoathingDate();

  const file = await renderSvg(date.getMoonsAsSvg("Noto Color Emoji"));

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
