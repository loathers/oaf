import { bypassAsString } from "@otplib/plugin-base32-alt";
import { crypto } from "@otplib/plugin-crypto-node";
import { generate, getRemainingTime, verify } from "@otplib/totp";
import {
  ChatInputCommandInteraction,
  Client,
  DiscordAPIError,
  Events,
  GuildMember,
  Message,
  PartialGuildMember,
  RESTJSONErrorCodes,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";

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

export const intDiv = (num: number, div: number) =>
  [Math.floor(num / div), num % div] as [quotient: number, remainder: number];
export const playerSecret = (playerId: number) =>
  `${config.SALT}-${playerId}`.padEnd(16, "0");

const TOTP_PERIOD = 120;

const totpOptions = (playerId: number) => ({
  secret: playerSecret(playerId),
  period: TOTP_PERIOD,
  crypto,
  base32: bypassAsString,
});

export async function generatePlayer(playerId: number) {
  const token = await generate(totpOptions(playerId));
  return Number(`${playerId}${token}`).toString(16);
}

export async function checkPlayer(input: string) {
  const decoded = parseInt(input, 16);
  const [playerId, token] = intDiv(decoded, 1e6);
  const verification = await verify({
    ...totpOptions(playerId),
    token: token.toString().padStart(6, "0"),
    epochTolerance: [TOTP_PERIOD, 0],
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

async function processClaim(
  token: string,
  discordId: string,
  member: GuildMember,
): Promise<string | null> {
  const [playerId, valid] = await checkPlayer(token);

  if (!valid) {
    return `That code is invalid. Hopefully it timed out and you're not being a naughty little ${member.user.username}`;
  }

  const player = await kolClient.players.fetch(playerId, true);

  if (!player) return null;

  const previouslyClaimedCount = await clearDiscordId(discordId);
  await claimPlayer(playerId, player.name, discordId, player.createdDate);

  const role = await member.guild.roles.fetch(config.VERIFIED_ROLE_ID);

  if (role) {
    await member.roles.add(role);
  }

  const previous =
    previouslyClaimedCount > 0
      ? " Any previous link will have been removed."
      : "";

  return `Your Discord account has been successfully linked with ${inlineCode(`${player.name} (#${player.id})`)}.${previous}`;
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

  await interaction.deferReply({ ephemeral: true });

  const guild =
    interaction.guild || (await discordClient.guilds.fetch(config.GUILD_ID));
  const member = await guild.members.fetch(interaction.user.id);

  const result = await processClaim(token, interaction.user.id, member);

  if (result) {
    await interaction.editReply(result);
  }
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

async function onMessage(message: Message) {
  if (message.author.bot) return;
  const member = message.member;
  if (!member) return;

  const opening = "/claim ";
  if (!message.content.startsWith(opening)) return;
  const token = message.content.slice(opening.length);
  if (!token) return;

  let deleted = true;
  try {
    await message.delete();
  } catch {
    deleted = false;
  }

  const dm = await member.user.createDM();

  const deleteStatus = deleted
    ? "I've deleted it"
    : `I tried to delete it but couldn't — you should [delete it yourself](${message.url})`;

  await dm.send(
    `Looks like you accidentally sent your claim token as a plain message. ${deleteStatus}. I'll do my best with what you've given me.`,
  );

  const result = await processClaim(token, member.user.id, member);

  await dm.send(
    result ??
      "Unable to find the player associated with that token. Try again, and remember to use the /claim slash command next time rather than sending a message. You can always use slash commands with me in our DM here!",
  );
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
        `Your token is ${token} (expires in ${getRemainingTime(undefined, TOTP_PERIOD) + 120} seconds)`,
      );
    })();
  });

  discordClient.once(
    Events.ClientReady,
    (client) => void synchroniseRoles(client),
  );
  discordClient.on(
    Events.GuildMemberRemove,
    (member) => void removeVerification(member),
  );
  discordClient.on(Events.MessageCreate, (message) => void onMessage(message));
}
