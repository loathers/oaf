import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { LibreLinkUpClient } from "../../clients/LibreLinkupClient.js";
import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("kenny")
  .setDescription(
    "Finally the answer to a question we never needed to ask - how sweet is Kenny?",
  );

export function makeComment(data: { isHigh: boolean; isLow: boolean }) {
  if (data.isHigh) return "That's high! KENNY NEED INSULIN!!!";
  if (data.isLow) return "That's low! KENNY NEED SUGAR!!!";
  return "That's fine.";
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new LibreLinkUpClient(
      config.KENNY_MONITOR_EMAIL!,
      config.KENNY_MONITOR_PASSWORD!,
      ({ firstName, lastName }) =>
        firstName === "Kenneth" && lastName === "Tester",
    );

    await client.login();
    const current = await client.latest();

    if (!current) {
      return void (await interaction.editReply(
        "Kenny is fully functional but contains no Data. Odd and troubling.",
      ));
    }

    interaction.editReply(
      `Kenny's blood glucose is currently ${
        current.value
      }mg/dL 🩸. ${makeComment(current)}`,
    );
  } catch (error) {
    return void (await interaction.editReply(
      "Can't communicate with Kenny's cyborg implant right now.",
    ));
  }
}
