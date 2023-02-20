import { ChatInputCommandInteraction, SlashCommandBuilder, bold, underscore } from "discord.js";

import { clanState } from "../../clans";
import { client } from "../../kol";

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

  const classMap: Map<string, string[]> = new Map();

  for (let player of clanState.killMap.keys()) {
    const playerEntry = clanState.killMap.get(player);
    if (!playerEntry) continue;
    if (!playerEntry.skills && !playerEntry.brainiac) continue;

    const details = await client.getBasicDetailsForUser(player);
    if (details.level < 15) continue;

    if (!classMap.has(details.class)) {
      classMap.set(details.class, []);
    }
    classMap.get(details.class)?.push(player);
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
