import { Player } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  bold,
  heading,
  messageLink,
} from "discord.js";
import { Player as KoLPlayer } from "kol.js";

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { wikiClient } from "../../clients/wiki.js";
import { config } from "../../config.js";
import { formatPlayer } from "../../utils.js";
import { embedForItem } from "../wiki/item.js";

export const data = new SlashCommandBuilder()
  .setName("raffle")
  .setDescription("See today's raffle prizes and yesterday's winners");

const numberFormat = new Intl.NumberFormat();

type Raffle = Awaited<ReturnType<typeof kolClient.getRaffle>>;

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  const { daynumber } = (await kolClient.fetchStatus()) ?? { daynumber: "0" };
  const raffle = await prisma.raffle.findUnique({
    where: { gameday: Number(daynumber) },
  });

  if (!raffle) {
    // If the rollover post didn't work for whatever reason, just run it now
    await interaction.editReply(
      "Hey, thanks! Rollover post was missing so I'll post it now",
    );
    await onRollover();
    return;
  }

  await interaction.editReply(
    `Results were posted here ${messageLink(config.RAFFLE_CHANNEL_ID, raffle.messageId)}`,
  );
}

async function trackRaffle(
  raffle: Awaited<ReturnType<typeof kolClient.getRaffle>>,
  messageId: string,
) {
  // Do this only if the raffle has actually loaded
  if (!raffle.today.first) {
    return;
  }

  // Add today to the database
  await prisma.raffle.create({
    data: {
      gameday: raffle.gameday,
      firstPrize: raffle.today.first!,
      secondPrize: raffle.today.second!,
      messageId: messageId,
    },
  });

  // Update yesterday's winners
  for (const winner of raffle.yesterday) {
    await prisma.raffleWins.create({
      data: {
        raffle: {
          connectOrCreate: {
            where: {
              gameday: raffle.gameday - 1,
            },
            create: {
              gameday: raffle.gameday - 1,
              firstPrize:
                raffle.yesterday.find((w) => w.place === 1)?.item ?? 0,
              secondPrize:
                raffle.yesterday.find((w) => w.place === 2)?.item ?? 0,
              messageId: "",
            },
          },
        },
        player: {
          connectOrCreate: {
            where: {
              playerId: winner.player.id,
            },
            create: {
              playerId: winner.player.id,
              playerName: winner.player.name,
              accountCreationDate: winner.player.createdDate,
            },
          },
        },
        tickets: winner.tickets,
        place: winner.place,
      },
    });
  }
}

async function buildRaffleEmbeds(raffle: Raffle) {
  const embeds = [];

  if (raffle.today.first === null || raffle.today.second === null) {
    embeds.push(
      createEmbed()
        .setTitle("First Prize: Rollover anticipation!")
        // Oprah giving out anticipation to all
        .setImage("https://i.imgur.com/JNhU5Tt.gif"),
    );
    return embeds;
  }

  const first =
    (await embedForItem(raffle.today.first)) ??
    createEmbed().setTitle(`Unknown item (#${raffle.today.first})`);
  first.setTitle(`Today's First Prize: ${first.toJSON().title}`);
  embeds.push(first);

  const second =
    (await embedForItem(raffle.today.second)) ??
    createEmbed().setTitle(`Unknown item (#${raffle.today.second})`);
  second.setTitle(`Today's Second Prize: ${second.toJSON().title}`);
  embeds.push(second);

  return embeds;
}

async function getWinners(raffle: Raffle) {
  return await prisma.player.findMany({
    where: {
      playerId: { in: raffle.yesterday.map((prize) => prize.player.id) },
      discordId: { not: null },
    },
  });
}

async function getAlertableWinners(players: Player[]) {
  const role = await discordClient.guild?.roles.fetch(config.LISTENER_ROLE_ID);
  if (!role) return [];
  return players
    .map((p) => p.discordId)
    .filter((s) => s !== null)
    .filter((s) => role.members.has(s));
}

async function getRaffleChannel() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const raffleChannel = guild?.channels.cache.get(config.RAFFLE_CHANNEL_ID);

  if (!raffleChannel?.isTextBased()) {
    await discordClient.alert("Raffle channel not found or not text-based");
    return null;
  }

  return raffleChannel;
}

async function renderWinners(raffle: Raffle, members: Player[]) {
  const renderWinner = (p: KoLPlayer) =>
    formatPlayer(members.find((m) => m.playerId === p.id) ?? p, p.id);

  return raffle.yesterday.map((winner) => {
    const itemName =
      wikiClient.items.find((i) => i.id === winner.item)?.name ??
      `Unknown item (#${winner.item})`;
    return `${winner.place === 1 ? "🥇" : "🥈"} - ${bold(itemName)} won by ${renderWinner(winner.player)} (with ${numberFormat.format(winner.tickets)} tickets)`;
  });
}

async function sendRaffleMessage(raffle: Raffle) {
  const raffleChannel = await getRaffleChannel();
  if (!raffleChannel) return;

  const winningMembers = await getWinners(raffle);
  const alertable = await getAlertableWinners(winningMembers);

  const winners = await renderWinners(raffle, winningMembers);

  return await raffleChannel.send({
    content: `${heading("Raffle Winners")}\n\n${winners.join("\n")}`,
    embeds: await buildRaffleEmbeds(raffle),
    allowedMentions: { users: alertable },
  });
}

async function onRollover() {
  const raffle = await kolClient.getRaffle();

  const message = await sendRaffleMessage(raffle);

  if (!message) return;

  await trackRaffle(raffle, message.id);
}

export async function init() {
  kolClient.on("rollover", onRollover);
}
