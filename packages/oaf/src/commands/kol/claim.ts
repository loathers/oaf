import { base32 } from "@otplib/plugin-base32-scure";
import { crypto } from "@otplib/plugin-crypto-node";
import { generate, getRemainingTime, verify } from "@otplib/totp";
import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  Events,
  GuildMember,
  PartialGuildMember,
  RESTJSONErrorCodes,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";
import { Client } from "discord.js";

import {
  claimPlayer,
  clearDiscordId,
  findPlayerByDiscordId,
  getVerifiedPlayers,
  setPlayerDiscordId,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";

const OAF_USER = config.KOL_USER.replaceAll(" ", "_");

const intDiv = (num: number, div: number) =>
  [Math.floor(num / div), num % div] as [quotient: number, remainder: number];
const playerSecret = (playerId: number) => `${config.SALT}-${playerId}`;

const TOTP_PERIOD = 120;

async function generatePlayer(playerId: number) {
  const token = await generate({
    secret: playerSecret(playerId),
    period: TOTP_PERIOD,
    crypto,
    base32,
  });
  return Number(`${playerId}${token}`).toString(16);
}

async function checkPlayer(token: string) {
  const decoded = parseInt(token, 16);
  const [playerId, totpToken] = intDiv(decoded, 1e6);
  const verification = await verify({
    secret: playerSecret(playerId),
    token: totpToken.toString().padStart(6, "0"),
    epochTolerance: [TOTP_PERIOD, 0],
    crypto,
    base32,
  });
  return [playerId, verification.valid] as [playerId: number, valid: boolean];
}

export const data = new SlashCommandBuilder()
  .setName("claim")
  .setDescription("Claim a KoL player account.")
  .addStringOption((option) =>
    option
      .setName("token")
      .setDescription("The token that I sent you")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const token = interaction.options.getString("token", false);

  if (!token) {
    await interaction.reply({
      content: `Get a verification token by sending ${inlineCode(
        `/msg ${OAF_USER} claim`,
      )} in chat`,
      ephemeral: true,
    });
    return;
  }

  const [playerId, valid] = await checkPlayer(token);

  if (!valid) {
    await interaction.reply({
      content: `That code is invalid. Hopefully it timed out and you're not being a naughty little ${interaction.user.username}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const player = await kolClient.players.fetch(playerId, true);

  if (!player) return;

  const discordId = interaction.user.id;

  const previouslyClaimedCount = await clearDiscordId(discordId);

  await claimPlayer(playerId, player.name, discordId, player.createdDate);

  const guild =
    interaction.guild || (await discordClient.guilds.fetch(config.GUILD_ID));
  const role = await guild.roles.fetch(config.VERIFIED_ROLE_ID);

  if (role) {
    const member = await guild.members.fetch(interaction.user.id);
    await member.roles.add(role);
  }

  const previous =
    previouslyClaimedCount > 0
      ? " Any previous link will have been removed."
      : "";

  await interaction.editReply(
    `Your Discord account has been successfully linked with ${inlineCode(
      `${player.name} (#${player.id})`,
    )}.${previous}`,
  );
}

async function synchroniseRoles(client: Client) {
  const guild = await client.guilds.fetch(config.GUILD_ID);

  const role = await guild.roles.fetch(config.VERIFIED_ROLE_ID);

  if (!role) {
    await discordClient.alert(
      `Verified role (${config.VERIFIED_ROLE_ID}) cannot be found`,
    );
    return;
  }

  const playersWithDiscordId = await getVerifiedPlayers();
  for (const member of role.members.values()) {
    const index = playersWithDiscordId.findIndex(
      (p) => p.discordId === member.user.id,
    );
    if (index < 0) {
      await member.roles.remove(role);
    } else {
      playersWithDiscordId.splice(index, 1);
    }
  }

  for (const missing of playersWithDiscordId) {
    try {
      const member = await guild.members.fetch(missing.discordId!);
      await member.roles.add(role);
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        error.code === RESTJSONErrorCodes.UnknownMember
      ) {
        // User has left the guild, remove their verification
        await setPlayerDiscordId(missing.playerId, null);
        await discordClient.alert(
          `Whomever was verified to player account ${missing.playerName} (#${missing.playerId}) left the server at some point, removing their verification`,
        );
        continue;
      }
      throw error;
    }
  }
}

async function removeVerification(member: GuildMember | PartialGuildMember) {
  const player = await findPlayerByDiscordId(member.id);

  if (!player) return;

  await setPlayerDiscordId(player.playerId, null);

  await discordClient.alert(
    `${member.user.username} has just left the server, so we removed their verification to player account ${player.playerName} (#${player.playerId})`,
  );
}

export function init() {
  kolClient.on("whisper", (whisper) => {
    void (async () => {
      if (whisper.msg.trim() !== "claim") return;

      const playerId = whisper.who.id;

      const token = await generatePlayer(playerId);

      await kolClient.whisper(
        playerId,
        `Your token is ${token} (expires in ${getRemainingTime(undefined, TOTP_PERIOD)} seconds)`,
      );
    })();
  });

  discordClient.on(
    Events.ClientReady,
    (client) => void synchroniseRoles(client),
  );
  discordClient.on(
    Events.GuildMemberRemove,
    (member) => void removeVerification(member),
  );
}
