import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

const data = new SlashCommandBuilder()
  .setName("item")
  .setDescription("Find the +item drop required to cap a drop.")
  .addNumberOption((option) =>
    option
      .setName("droprate")
      .setDescription("The droprate of the item in question.")
      .setRequired(true)
  );

export function execute(interaction: CommandInteraction): void {
  const drop = interaction.options.getNumber("droprate", true);
  if (drop <= 0) {
    interaction.reply({ content: `Please supply a positive droprate.`, ephemeral: true });
    return;
  }

  if (drop > 99.9) {
    interaction.reply(`A 100% drop does not require any item drop bonus to cap.`);
    return;
  }

  interaction.reply(
    `A ${drop.toFixed(1)}% drop requires a +${
      Math.ceil(10000 / drop) - 100
    }% item drop bonus to cap.`
  );
}
