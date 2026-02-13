import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  SlashCommandBuilder,
} from "discord.js";

import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import { findPlayer } from "../_player.js";
import { ALL_CLANS } from "./_clans.js";

const PERMITTED_ROLE_IDS = config.WHITELIST_ROLE_IDS.split(",");

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Adds a player to the Dreadsylvania clan whitelists.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription(
        "An @mention of the discord account associated with the kol account to whitelist.",
      )
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;

  if (!member) {
    await interaction.reply({
      content: "You have to perform this action from within a Guild.",
      ephemeral: true,
    });
    return;
  }

  const roleManager = member.roles as GuildMemberRoleManager;

  if (!PERMITTED_ROLE_IDS.some((r) => roleManager.cache.has(r))) {
    await interaction.reply({
      content: "You are not permitted to edit clan whitelists.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const input = interaction.options.getString("player", true);

  if (!input.match(/^<@\d+>$/)) {
    return void (await interaction.editReply(
      `Can only whitelist via user mention, and I don't see a user mention in the string ${input}`,
    ));
  }

  const player = await findPlayer({ discordId: input.slice(2, -1) });

  if (!player) {
    return void (await interaction.editReply(
      `Couldn't find a kol account associated with discord user ${input}`,
    ));
  }

  for (const clan of ALL_CLANS) {
    await kolClient.addToWhitelist(player.playerId, clan.id);
  }

  await interaction.editReply({
    content: `Added player ${player.playerName} (#${player.playerId}) to all managed clan whitelists.`,
  });
}
