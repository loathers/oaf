import {
  ChatInputCommandInteraction,
  Events,
  GuildMember,
  PartialGuildMember,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";
import { Client } from "discord.js";
import { totp } from "otplib";

import { prisma } from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";

const OAF_USER = config.KOL_USER.replaceAll(" ", "_");

const intDiv = (num: number, div: number) =>
  [Math.floor(num / div), num % div] as [quotient: number, remainder: number];
const playerSecret = (playerId: number) => `${config.SALT}-${playerId}`;

const oauf = Object.assign(
  totp,
  { options: { ...totp.options, step: 2 * 60 } },
  {
    generatePlayer: (playerId: number) =>
      Number(`${playerId}${oauf.generate(playerSecret(playerId))}`).toString(
        16,
      ),
    checkPlayer: (token: string) => {
      const decoded = parseInt(token, 16);
      const [playerId, totpToken] = intDiv(decoded, 1e6);
      return [
        playerId,
        oauf.check(
          totpToken.toString().padStart(6, "0"),
          playerSecret(playerId),
        ),
      ] as [playerId: number, valid: boolean];
    },
  },
);

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

  const [playerId, valid] = oauf.checkPlayer(token);

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

  const previouslyClaimed = await prisma.player.updateMany({
    where: { discordId },
    data: { discordId: null },
  });

  await prisma.player.upsert({
    where: { playerId },
    update: {
      discordId,
      playerName: player.name,
      accountCreationDate: player.createdDate,
    },
    create: {
      playerName: player.name,
      discordId: interaction.user.id,
      playerId,
      accountCreationDate: player.createdDate,
    },
  });

  const guild =
    interaction.guild || (await discordClient.guilds.fetch(config.GUILD_ID));
  const role = await guild.roles.fetch(config.VERIFIED_ROLE_ID);

  if (role) {
    const member = await guild.members.fetch(interaction.user.id);
    await member.roles.add(role);
  }

  const previous =
    previouslyClaimed.count > 0
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

  const playersWithDiscordId = await prisma.player.findMany({
    where: { discordId: { not: null } },
  });
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
      // User has left the guild, remove their verification
      await prisma.player.update({
        where: { playerId: missing.playerId },
        data: { discordId: null },
      });
      await discordClient.alert(
        `Whomever was verified to player account ${missing.playerName} (#${missing.playerId}) left the server at some point, removing their verification`,
      );
    }
  }
}

async function removeVerification(member: GuildMember | PartialGuildMember) {
  const player = await prisma.player.findFirst({
    where: { discordId: member.id },
  });

  if (!player) return;

  await prisma.player.update({
    where: { playerId: player.playerId },
    data: { discordId: null },
  });

  const role = await member.guild.roles.fetch(config.VERIFIED_ROLE_ID);
  if (role) await member.roles.remove(role);

  await discordClient.alert(
    `${member.user.username} has just left the server, so we removed their verification to player account ${player.playerName} (#${player.playerId})`,
  );
}

export async function init() {
  kolClient.on("whisper", async (whisper) => {
    if (whisper.msg.trim() !== "claim") return;

    const playerId = whisper.who.id;

    const token = oauf.generatePlayer(playerId);

    await kolClient.whisper(
      playerId,
      `Your token is ${token} (expires in ${totp.timeRemaining()} seconds)`,
    );
  });

  discordClient.on(Events.ClientReady, synchroniseRoles);
  discordClient.on(Events.GuildMemberRemove, removeVerification);
}
