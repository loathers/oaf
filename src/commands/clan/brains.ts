import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { Pool } from "pg";
import { clanState, PlayerData } from "../../clans";
import { KoLClient } from "../../kol";
import { Command } from "../type";

async function setbrainiac(interaction: CommandInteraction, databasePool: Pool) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await databasePool.query(
    "INSERT INTO players (username, brainiac) VALUES ($1, TRUE) ON CONFLICT (username) DO UPDATE SET brainiac = TRUE;",
    [username]
  );
  if (clanState.killMap.has(username))
    (clanState.killMap.get(username) as PlayerData).brainiac = true;
  else
    clanState.killMap.set(username, {
      kills: 0,
      skills: 0,
      brainiac: true,
    });
  interaction.editReply(
    `Added user "${username}" to the list of players always available to help with skills.`
  );
  return;
}

async function setUnbrainiac(interaction: CommandInteraction, databasePool: Pool) {
  const username = interaction.options.getString("player", true).toLowerCase();
  await interaction.deferReply();
  await databasePool.query(
    "INSERT INTO players (username, brainiac) VALUES ($1, FALSE) ON CONFLICT (username) DO UPDATE SET brainiac = FALSE;",
    [username]
  );
  if (clanState.killMap.has(username))
    (clanState.killMap.get(username) as PlayerData).brainiac = false;
  interaction.editReply(
    `Removed user "${username}" from the list of players always available to help with skills.`
  );
  return;
}

async function getBrains(interaction: CommandInteraction, kolClient: KoLClient): Promise<void> {
  interaction.deferReply();
  const baseClasses = [
    "Seal Clubber",
    "Turtle Tamer",
    "Pastamancer",
    "Sauceror",
    "Disco Bandit",
    "Accordion Thief",
  ];
  const classMap: Map<string, string[]> = new Map();
  for (let player of clanState.killMap.keys()) {
    const playerEntry = clanState.killMap.get(player);
    if (!!playerEntry?.skills || playerEntry?.brainiac) {
      const details = await kolClient.getBasicDetailsForUser(player);
      if (details.level >= 15) {
        if (!classMap.has(details.class)) {
          classMap.set(details.class, []);
        }
        classMap.get(details.class)?.push(player);
      }
    }
  }
  interaction.editReply({
    content: null,
    embeds: [
      {
        title: "Potentially available brains",
        description:
          "Somersaulter, kenny kamAKAzi, and 3BH can pilot dread multis for any class of brain, subject to multi restrictions.",
        fields: baseClasses.map((playerClass) => {
          if (!classMap.has(playerClass)) {
            return {
              name: `**__${playerClass}__**`,
              value: "None available.",
              inline: true,
            };
          }
          return {
            name: `**__${playerClass}__**`,
            value: (classMap.get(playerClass) as string[])
              .sort()
              .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
              .join("\n"),
            inline: true,
          };
        }),
      },
    ],
  });
}

const command: Command = {
  attach: ({ discordClient, databasePool, kolClient }) => {
    discordClient.attachCommand(
      "brainiac",
      [
        {
          name: "player",
          description: "The player to set as always available for brain draining.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => setbrainiac(interaction, databasePool),
      "Set a player as always available for Dreadsylvania skills."
    );
    discordClient.attachCommand(
      "unbrainiac",
      [
        {
          name: "player",
          description: "The player to unset as always available for brain draining.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => setUnbrainiac(interaction, databasePool),
      "Unset a player as always available for Dreadsylvania skills."
    );
    discordClient.attachCommand(
      "brains",
      [],
      (interaction: CommandInteraction) => getBrains(interaction, kolClient),
      "Find players whose brains can be drained for Dreadsylvania skills."
    );
  },
};

export default command;
