import { ChatInputCommandInteraction, SlashCommandBuilder, inlineCode } from "discord.js";
import { totp } from "otplib";

import { prisma } from "../../clients/database";
import { kolClient } from "../../clients/kol";

const SALT = process.env.SALT;
const OAF_USER = process.env.KOL_USER?.replaceAll(" ", "_");

const intDiv = (num: number, div: number) =>
  [Math.floor(num / div), num % div] as [quotient: number, remainder: number];
const playerSecret = (playerId: number) => `${SALT}-${playerId}`;

const oauf = Object.assign(
  totp,
  { options: { ...totp.options, step: 2 * 60 } },
  {
    generatePlayer: (playerId: number) =>
      Number(`${playerId}${oauf.generate(playerSecret(playerId))}`).toString(16),
    checkPlayer: (token: string) => {
      const decoded = parseInt(token, 16);
      const [playerId, totpToken] = intDiv(decoded, 1e6);
      return [
        playerId,
        oauf.check(totpToken.toString().padStart(6, "0"), playerSecret(playerId)),
      ] as [playerId: number, valid: boolean];
    },
  }
);

export const data = new SlashCommandBuilder()
  .setName("claim")
  .setDescription("Claim a KoL player account.")
  .addStringOption((option) =>
    option.setName("token").setDescription("The token that OAF sent you").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const token = interaction.options.getString("token", false);

  if (!token) {
    await interaction.reply({
      content: `Get a verification token by sending ${inlineCode(
        `/msg ${OAF_USER} claim`
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

  const player = await kolClient.getPartialPlayerFromId(playerId);

  if (!player) {
    await interaction.editReply({
      content:
        "Hmm we can't see that user. But it's a valid token, so this is our fault or something very bad has happened",
    });
    return;
  }

  await prisma.player.upsert({
    where: { playerId: player.id },
    update: { discordId: interaction.user.id },
    create: {
      username: player.name.toLowerCase(),
      discordId: interaction.user.id,
      playerId: player.id,
    },
  });

  await interaction.editReply(
    `Your Discord account has been successfully linked with ${inlineCode(
      `${player.name} (#${player.id})`
    )}`
  );
}

export async function init() {
  kolClient.on("whisper", async (whisper) => {
    if (whisper.msg.trim() !== "claim") return;

    const playerId = whisper.who.id;

    const token = oauf.generatePlayer(playerId);

    await kolClient.whisper(
      playerId,
      `Your token is ${token} (expires in ${totp.timeRemaining()} seconds)`
    );
  });
}
