import { ChatInputCommandInteraction, SlashCommandBuilder, bold, underscore } from "discord.js";

import { kolClient } from "../../clients/kol";
import { clanState } from "./_clans";

const BASE_CLASSES = [
  "Seal Clubber",
  "Turtle Tamer",
  "Pastamancer",
  "Sauceror",
  "Disco Bandit",
  "Accordion Thief",
];

export const data = new SlashCommandBuilder()
  .setName("brains")
  .setDescription("Find players whose brains can be drained for Dreadsylvania skills.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const classMap = new Map<string, string[]>();

  for (let playerName of clanState.killMap.keys()) {
    const playerEntry = clanState.killMap.get(playerName);
    if (!playerEntry) continue;
    if (!playerEntry.skills && !playerEntry.brainiac) continue;

    const player = await kolClient.getPartialPlayerFromName(playerName);
    if (!player || player.level < 15) continue;

    if (!classMap.has(player.class)) {
      classMap.set(player.class, []);
    }
    classMap.get(player.class)!.push(playerName);
  }

  await interaction.editReply({
    content: null,
    embeds: [
      {
        title: "Potentially available brains",
        description:
          "Captain Scotch, kenny kamAKAzi, and 3BH can pilot dread multis for any class of brain, subject to multi restrictions.",
        fields: BASE_CLASSES.map((playerClass) => ({
          name: bold(underscore(playerClass)),
          value: classMap.has(playerClass)
            ? classMap
                .get(playerClass)!
                .sort()
                .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
                .join("\n")
            : "None available.",
          inline: true,
        })),
      },
    ],
  });
}
