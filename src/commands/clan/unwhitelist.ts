import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { assertNotRollover, clan } from "../../clients/kol.js";
import { config } from "../../config.js";
import { identifyPlayer } from "../_player.js";
import { DUNGEON_CLANS } from "./_clans.js";

const PERMITTED_ROLE_IDS = config.WHITELIST_ROLE_IDS.split(",");

export const data = new SlashCommandBuilder()
  .setName("unwhitelist")
  .setDescription(
    "Removes a player from the Dreadsylvania clan whitelists and boots them if relevant.",
  )
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription(
        "The name or id of the KoL player you're booting, or a mention of a Discord user.",
      )
      .setRequired(true)
      .setMaxLength(30),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) return;

  if (!PERMITTED_ROLE_IDS.some((r) => interaction.member.roles.cache.has(r))) {
    await interaction.reply({
      content: "You are not permitted to edit clan whitelists.",
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  assertNotRollover();

  await interaction.deferReply();

  const input = interaction.options.getString("player", true);
  const identification = await identifyPlayer(input);

  if (typeof identification === "string") {
    await interaction.editReply(identification);
    return;
  }

  const player = identification[1];
  if (!player) {
    await interaction.editReply(
      "Something went horribly wrong in the process of trying to figure out who you want to boot",
    );
    return;
  }

  for (const dungeonClan of DUNGEON_CLANS) {
    await clan.bootPlayer(player.playerId, dungeonClan.id);
    await clan.removePlayerFromWhitelist(player.playerId, dungeonClan.id);
  }

  await interaction.editReply({
    content: `Booted player ${player.playerName} (#${player.playerId}) from all managed clans and their whitelists.`,
  });
}
