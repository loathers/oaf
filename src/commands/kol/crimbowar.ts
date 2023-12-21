import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const data = new SlashCommandBuilder()
  .setName("crimbowar")
  .setDescription(
    "Find information about the current status of the Elf/Pirate war",
  );

async function visitCrimbo() {
  return await kolClient.actionMutex.runExclusive(async () => {
    await kolClient.visitUrl("main.php");
    return await kolClient.visitUrl("place.php", {
      whichplace: "crimbo23",
    });
  });
}

const ZONES = ["armory", "bar", "cafe", "abuela", "factory"] as const;
type CrimboZone = (typeof ZONES)[number];
const STATES = ["war", "elf", "pirate"] as const;
type CrimboZoneState = (typeof STATES)[number];
type CrimboStatus = Record<CrimboZoneState, CrimboZone[]>;

function parseCrimbo(page: string): CrimboStatus {
  return Object.fromEntries(
    STATES.map((state): [CrimboZoneState, CrimboZone[]] => [
      state,
      ZONES.filter((zone) => page.includes(`${zone}_${state}.gif`)),
    ]),
  ) as CrimboStatus;
}

export async function execute(interaction: ChatInputCommandInteraction) {
  interaction.deferReply();

  const page = await visitCrimbo();

  if (page.includes("has faded into the mists")) {
    return void (await interaction.editReply(
      "Looks like Crimbo '23 is over, baby!",
    ));
  }

  if (!page) {
    return void (await interaction.editReply(
      "We were unable to visit Crimbo town--is it rollover right now?",
    ));
  }

  const status = parseCrimbo(page);

  const embed = createEmbed().setTitle("Crimbo '23");

  embed.addFields(
    Object.entries(status).map(([state, zones]) => ({
      name: `${state} zones`,
      value: zones.join(", ") || "none!",
    })),
  );

  interaction.editReply({ content: null, embeds: [embed] });
}
