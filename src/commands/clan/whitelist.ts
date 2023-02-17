import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction, GuildMemberRoleManager } from "discord.js";

import { ALL_CLANS } from "../../clans";
import { KoLClient } from "../../kol";
import { Command } from "../type";

const PERMITTED_ROLES = [
  // Extended Team
  "473316929768128512",
  // Lyft & Aen
  "466624206126448641",
];

async function whitelist(interaction: CommandInteraction, kolClient: KoLClient) {
  const member = interaction.member;

  if (!member) {
    interaction.reply({
      content: "You have to perform this action from within a Guild.",
      ephemeral: true,
    });
    return;
  }

  const roleManager = member.roles as GuildMemberRoleManager;

  if (!PERMITTED_ROLES.some((r) => roleManager.cache.has(r))) {
    interaction.reply({
      content: "You are not permitted to edit clan whitelists.",
      ephemeral: true,
    });
    return;
  }

  const player = interaction.options.getString("player", true);
  interaction.deferReply();
  const playerData = await kolClient.getBasicDetailsForUser(player);
  if (!playerData.id) {
    interaction.editReply({ content: "Player not found." });
    return;
  }
  for (let clan of ALL_CLANS) {
    await kolClient.addToWhitelist(playerData.id, clan.id);
  }
  interaction.editReply({
    content: `Added player ${player} (#${playerData.id}) to all managed clan whitelists.`,
  });
}

const command: Command = {
  attach: ({ discordClient, kolClient }) =>
    discordClient.attachCommand(
      "whitelist",
      [
        {
          name: "player",
          description: "The name of the player to add to the whitelists.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      (interaction: CommandInteraction) => whitelist(interaction, kolClient),
      "Adds a player to the Dreadsylvania clan whitelists."
    ),
};

export default command;
