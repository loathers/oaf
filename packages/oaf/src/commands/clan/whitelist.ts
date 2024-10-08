import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
} from "discord.js";

import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { identifyPlayer } from "../_player.js";
import { ALL_CLANS } from "./_clans.js";

const PERMITTED_ROLE_IDS = config.WHITELIST_ROLE_IDS.split(",");

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Adds a player to the Dreadsylvania clan whitelists.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription("The name of the player to add to the whitelists.")
      .setRequired(true),
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

  if (!PERMITTED_ROLE_IDS.some((r) => roleManager.cache.has(r))) {
    interaction.reply({
      content: "You are not permitted to edit clan whitelists.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const input = interaction.options.getString("player", true);

  const identification = await identifyPlayer(input);

  if (typeof identification === "string") {
    interaction.editReply(identification);
    return;
  }

  const [player] = identification;

  for (const clan of ALL_CLANS) {
    await kolClient.addToWhitelist(player.id, clan.id);
  }

  interaction.editReply({
    content: `Added player ${player.name} (#${player.id}) to all managed clan whitelists.`,
  });
}
