import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  heading,
  messageLink,
} from "discord.js";

import { prisma } from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { wikiClient } from "../../clients/wiki.js";
import { config } from "../../config.js";
import { embedForItem } from "../wiki/item.js";

export const data = new SlashCommandBuilder()
  .setName("raffle")
  .setDescription("See today's raffle prizes and yesterday's winners");

const numberFormat = new Intl.NumberFormat();

async function getRaffleEmbeds(
  raffle: Awaited<ReturnType<typeof kolClient.getRaffle>>,
) {
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
  first.setTitle(`First Prize: ${first.toJSON().title}`);
  embeds.push(first);

  const second =
    (await embedForItem(raffle.today.second)) ??
    createEmbed().setTitle(`Unknown item (#${raffle.today.second})`);
  second.setTitle(`Second Prize: ${second.toJSON().title}`);
  embeds.push(second);

  const winners = createEmbed().setTitle(`Yesterday's Winners`);

  winners.addFields(
    raffle.yesterday.map((winner) => {
      const itemName =
        wikiClient.items.find((i) => i.id === winner.item)?.name ??
        `Unknown item (#${winner.item})`;
      return {
        name: itemName,
        value: `${winner.player.toString()} (${numberFormat.format(winner.tickets)} tickets)`,
      };
    }),
  );

  embeds.push(winners);
  return embeds;
}

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

async function onRollover() {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const raffleChannel = guild?.channels.cache.get(config.RAFFLE_CHANNEL_ID);

  if (!raffleChannel?.isTextBased()) {
    await discordClient.alert("Raffle channel not found or not text-based");
    return;
  }

  const raffle = await kolClient.getRaffle();

  const message = await raffleChannel.send({
    content: heading("Raffle"),
    embeds: await getRaffleEmbeds(raffle),
    allowedMentions: { users: [] },
  });

  await trackRaffle(raffle, message.id);
}

export async function init() {
  kolClient.on("rollover", onRollover);
}
