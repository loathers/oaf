import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
} from "discord.js";

import { kolClient } from "../../clients/kol";
import { ALL_CLANS } from "./_clans";

const PERMITTED_ROLES = [
  // Extended Team
  "473316929768128512",
  // Lyft & Aen
  "466624206126448641",
];

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Adds a player to the Dreadsylvania clan whitelists.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription("The name of the player to add to the whitelists.")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
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

  const playerNameOrId = interaction.options.getString("player", true);

  await interaction.deferReply();

  const player = await kolClient.getPartialPlayer(playerNameOrId);

  if (!player) {
    interaction.editReply({ content: "Player not found." });
    return;
  }

  for (const clan of ALL_CLANS) {
    await kolClient.addToWhitelist(player.id, clan.id);
  }

  interaction.editReply({
    content: `Added player ${player.name} (#${player.id}) to all managed clan whitelists.`,
  });
}
