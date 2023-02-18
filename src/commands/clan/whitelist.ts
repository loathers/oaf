import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
} from "discord.js";

import { ALL_CLANS } from "../../clans";
import { client } from "../../kol";

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

  const player = interaction.options.getString("player", true);
  interaction.deferReply();
  const playerData = await client.getBasicDetailsForUser(player);
  if (!playerData.id) {
    interaction.editReply({ content: "Player not found." });
    return;
  }
  for (let clan of ALL_CLANS) {
    await client.addToWhitelist(playerData.id, clan.id);
  }
  interaction.editReply({
    content: `Added player ${player} (#${playerData.id}) to all managed clan whitelists.`,
  });
}
