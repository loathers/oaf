import { ChatInputCommandInteraction, SlashCommandBuilder, bold, underscore } from "discord.js";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";
import { titleCase } from "../../utils";

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

  const players = await prisma.player.findMany({
    where: { OR: [{ brainiac: true }, { skills: { gt: 0 } }] },
  });

  for (const player of players) {
    const current = await kolClient.getPartialPlayerFromId(player.playerId);
    if (!current || current.level < 15) continue;

    if (!classMap.has(current.class)) {
      classMap.set(current.class, []);
    }
    classMap.get(current.class)!.push(player.username);
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
            ? classMap.get(playerClass)!.sort().map(titleCase).join("\n")
            : "None available.",
          inline: true,
        })),
      },
    ],
  });
}
