import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TimestampStyles,
  time,
} from "discord.js";

import { LibreLinkUpClient } from "../../clients/LibreLinkupClient.js";
import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("kenny")
  .setDescription(
    "Finally the answer to a question we never needed to ask - how sweet is Kenny?",
  );

export function makeComment(data: { isHigh: boolean; isLow: boolean }) {
  if (data.isHigh) return "that's high! KENNY NEED INSULIN!!!";
  if (data.isLow) return "that's low! KENNY NEED SUGAR!!!";
  return "that's fine.";
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
    const latest = await client.latest();

    if (!latest) {
      return void (await interaction.editReply(
        "Kenny is fully functional but contains no Data. Odd and troubling.",
      ));
    }

    interaction.editReply(
      `Kenny's blood glucose 🩸 was ${latest.value}mg/dL ${time(
        latest.date,
        TimestampStyles.RelativeTime,
      )}. According to the API, ${makeComment(latest)}. According to Kenny's own statement of the range, ${makeComment({ isHigh: latest.value >= 180, isLow: latest.value <= 70 })}`,
    );
  } catch (error) {
    return void (await interaction.editReply(
      "Can't communicate with Kenny's cyborg implant right now.",
    ));
  }
}
