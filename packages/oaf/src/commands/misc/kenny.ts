import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TimestampStyles,
  time,
} from "discord.js";

import { LibreLinkUpClient } from "../../clients/LibreLinkupClient.js";
import { discordClient } from "../../clients/discord.js";
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

const KENNY_TOO_HIGH = 180;
const KENNY_TOO_LOW = 70;

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

    await interaction.editReply(
      `Kenny's blood glucose 🩸 was ${latest.value}mg/dL ${time(
        latest.date,
        TimestampStyles.RelativeTime,
      )}. ${makeComment({ isHigh: latest.value >= KENNY_TOO_HIGH, isLow: latest.value <= KENNY_TOO_LOW })}`,
    );
  } catch (error) {
    await discordClient.alert(
      `Kenny cyborg implant error: ${JSON.stringify(error)}`,
      interaction,
      error,
    );
    return void (await interaction.editReply(
      "Can't communicate with Kenny's cyborg implant right now.",
    ));
  }
}
