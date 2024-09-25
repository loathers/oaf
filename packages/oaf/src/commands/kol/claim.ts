import {
  ChatInputCommandInteraction,
  Events,
  Guild,
  GuildMember,
  Message,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";
import { Client } from "discord.js";
import { Player } from "kol.js";
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

async function updatePlayerVerification(
  player: Player<true>,
  playerId: number,
  discordId: string,
  guild: Guild,
  member: GuildMember,
): Promise<boolean> {
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
      discordId,
      playerId,
      accountCreationDate: player.createdDate,
    },
  });

  const role = await guild.roles.fetch(config.VERIFIED_ROLE_ID);

  if (role) {
    await member.roles.add(role);
  }

  return previouslyClaimed.count > 0;
}

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
  const guild =
    interaction.guild || (await discordClient.guilds.fetch(config.GUILD_ID));
  const member = await guild.members.fetch(interaction.user.id);

  const previouslyClaimed = await updatePlayerVerification(
    player,
    playerId,
    discordId,
    guild,
    member,
  );

  const previous = previouslyClaimed
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
  const expectedMembers = playersWithDiscordId.map((p) => p.discordId!);

  for (const member of role.members.values()) {
    const index = expectedMembers.indexOf(member.user.id);
    if (index < 0) {
      await member.roles.remove(role);
    } else {
      expectedMembers.splice(index, 1);
    }
  }

  for (const missing of expectedMembers) {
    // Catch cases where user has left the guild
    const member = await guild.members.fetch(missing).catch(() => null);
    if (member) await member.roles.add(role);
  }
}

async function onMessage(message: Message) {
  if (message.author.bot) return;
  if (!("send" in message.channel)) return;
  const member = message.member;
  if (!member) return;

  const opening = "/claim ";
  if (!message.content.startsWith(opening)) return;
  const token = message.content.slice(opening.length);
  if (!token) return;

  const reply = await message.reply(
    "Looks like you accidentally failed to send this as a slash command. Don't worry, I'll do my best with what you've given me.",
  );

  const [playerId, valid] = oauf.checkPlayer(token);
  if (!valid) {
    return void (await reply.edit(
      `That code is invalid. Hopefully it timed out and you're not being a naughty little ${message.member.user.username}`,
    ));
  }

  const player = await kolClient.players.fetch(playerId, true);

  if (!player) {
    return void (await reply.edit(
      "Unable to find the player associated with that token. Sorry, we did our best.",
    ));
  }

  const discordId = message.member.user.id;
  const guild =
    member.guild || (await discordClient.guilds.fetch(config.GUILD_ID));

  const previouslyClaimed = await updatePlayerVerification(
    player,
    playerId,
    discordId,
    guild,
    member,
  );

  const previous = previouslyClaimed
    ? " Any previous link will have been removed."
    : "";

  return void (await reply.edit(
    `Your discord account has been successfully linked with ${inlineCode(`${player.name} (#${player.id})`)}.${previous}`,
  ));
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
  discordClient.on(Events.MessageCreate, onMessage);
}
