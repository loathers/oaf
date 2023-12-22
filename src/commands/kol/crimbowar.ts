import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";

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

function buildEmbed(status: CrimboStatus, title: string) {
  const embed = createEmbed().setTitle(title);

  embed.addFields(
    Object.entries(status).map(([state, zones]) => ({
      name: `${state} zones`,
      value: zones.join(", ") || "none!",
    })),
  );

  return embed;
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

  interaction.editReply({
    content: null,
    embeds: [buildEmbed(status, "Crimbo '23")],
  });
}

export async function init() {
  kolClient.on("public", async ({ channel, who, msg }) => {
    if (
      channel === "crimbo" &&
      who.id === -111 &&
      !msg.includes("%") &&
      !msg.includes("plan, ensuring maximum") &&
      ZONES.some((zone) => msg.includes(zone))
    ) {
      const crimboChannel = discordClient.guild?.channels.cache.get(
        config.CRIMBO_CHANNEL_ID,
      );
      if (!crimboChannel?.isTextBased()) {
        return void discordClient.alert(
          "The guild or crimbo channel are incorrectly configured",
        );
      }

      const page = await visitCrimbo();

      if (page.includes("has faded into the mists")) {
        return void (await discordClient.alert(
          "We thought Crimbo rolled over, but it's faded into the mists!",
        ));
      }

      if (!page) {
        return void (await discordClient.alert(
          "We thought Crimbo rolled over, but it's rollover probably!",
        ));
      }

      const status = parseCrimbo(page);

      return void (await crimboChannel.send({
        embeds: [buildEmbed(status, "CHANGE PLACES!")],
      }));
    }
  });
}
