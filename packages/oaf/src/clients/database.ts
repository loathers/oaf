import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";

import { config } from "../config.js";
import type { DB, Player } from "../database-types.js";

function getConnectionString() {
  if (!config.DATABASE_URL) return undefined;

  const url = new URL(config.DATABASE_URL);

  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set("connect_timeout", "30");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "30");
  }

  return url.toString();
}

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: getConnectionString(),
    }),
  }),
});

// ── Player ──

export async function getVerifiedPlayers() {
  return await db
    .selectFrom("Player")
    .selectAll()
    .where("discordId", "is not", null)
    .execute();
}

export async function getVerifiedPlayerIds() {
  return (
    await db
      .selectFrom("Player")
      .select("playerId")
      .where("discordId", "is not", null)
      .execute()
  ).map((r) => r.playerId);
}

export async function findPlayerByDiscordId(discordId: string) {
  return await db
    .selectFrom("Player")
    .selectAll()
    .where("discordId", "=", discordId)
    .executeTakeFirst();
}

export async function findPlayerWithRaffleWins(where: {
  playerId?: number;
  discordId?: string;
}) {
  let query = db
    .selectFrom("Player")
    .selectAll("Player")
    .leftJoin("RaffleWins", "RaffleWins.playerId", "Player.playerId");

  if (where.playerId !== undefined) {
    query = query.where("Player.playerId", "=", where.playerId);
  }
  if (where.discordId !== undefined) {
    query = query.where("Player.discordId", "=", where.discordId);
  }

  const rows = await query
    .select(["RaffleWins.gameday", "RaffleWins.place", "RaffleWins.tickets"])
    .execute();

  if (rows.length === 0) return null;

  const player = {
    playerId: rows[0].playerId,
    playerName: rows[0].playerName,
    accountCreationDate: rows[0].accountCreationDate,
    doneWithSkills: rows[0].doneWithSkills,
    brainiac: rows[0].brainiac,
    discordId: rows[0].discordId,
    latitude: rows[0].latitude,
    longitude: rows[0].longitude,
    thiccEntered: rows[0].thiccEntered,
    thiccGifteeId: rows[0].thiccGifteeId,
  } satisfies Player;

  const raffleWins = rows
    .filter((r) => r.gameday !== null)
    .map((r) => ({
      gameday: r.gameday!,
      playerId: player.playerId,
      place: r.place!,
      tickets: r.tickets!,
    }));

  return { ...player, raffleWins };
}

export async function clearDiscordId(discordId: string) {
  const result = await db
    .updateTable("Player")
    .set({ discordId: null })
    .where("discordId", "=", discordId)
    .executeTakeFirst();
  return Number(result.numUpdatedRows);
}

export async function setPlayerDiscordId(
  playerId: number,
  discordId: null | string,
) {
  await db
    .updateTable("Player")
    .set({ discordId })
    .where("playerId", "=", playerId)
    .execute();
}

export async function claimPlayer(
  playerId: number,
  playerName: string,
  discordId: string,
  accountCreationDate?: Date | null,
) {
  await db
    .insertInto("Player")
    .values({
      playerId,
      playerName,
      discordId,
      accountCreationDate: accountCreationDate ?? null,
    })
    .onConflict((oc) =>
      oc.column("playerId").doUpdateSet({
        discordId,
        playerName,
        accountCreationDate: accountCreationDate ?? null,
      }),
    )
    .execute();
}

export async function upsertPlayerInfo(
  playerId: number,
  playerName: string,
  accountCreationDate?: Date | null,
) {
  await db
    .insertInto("Player")
    .values({
      playerId,
      playerName,
      accountCreationDate: accountCreationDate ?? null,
    })
    .onConflict((oc) =>
      oc.column("playerId").doUpdateSet({
        playerName,
        accountCreationDate: accountCreationDate ?? null,
      }),
    )
    .execute();
}

export async function setPlayerDoneWithSkills(
  playerId: number,
  playerName: string,
  doneWithSkills: boolean,
) {
  await db
    .insertInto("Player")
    .values({ playerId, playerName, doneWithSkills })
    .onConflict((oc) => oc.column("playerId").doUpdateSet({ doneWithSkills }))
    .execute();
}

export async function setPlayerBrainiac(
  playerId: number,
  playerName: string,
  brainiac: boolean,
) {
  await db
    .insertInto("Player")
    .values({ playerId, playerName, brainiac })
    .onConflict((oc) => oc.column("playerId").doUpdateSet({ brainiac }))
    .execute();
}

export async function getPlayersEligibleForBrains() {
  return await db
    .selectFrom("Player")
    .selectAll()
    .where((eb) =>
      eb.or([
        eb("brainiac", "=", true),
        eb.exists(
          eb
            .selectFrom("RaidParticipation")
            .select(sql.lit(1).as("one"))
            .whereRef("RaidParticipation.playerId", "=", "Player.playerId")
            .where("RaidParticipation.skills", ">", 0),
        ),
      ]),
    )
    .execute();
}

export async function getPlayersByIdsWithDiscord(playerIds: number[]) {
  if (playerIds.length === 0) return [];
  return await db
    .selectFrom("Player")
    .selectAll()
    .where("playerId", "in", playerIds)
    .where("discordId", "is not", null)
    .execute();
}

export async function getPlayersWithRaidParticipation() {
  const players = await db
    .selectFrom("Player")
    .select(["playerId", "playerName", "discordId", "doneWithSkills"])
    .execute();

  const participation = await db
    .selectFrom("RaidParticipation")
    .selectAll()
    .execute();

  return { players, participation };
}

export async function getMapPositions() {
  return await db
    .selectFrom("Player")
    .select(["latitude", "longitude"])
    .where("latitude", "is not", null)
    .where("longitude", "is not", null)
    .execute();
}

export async function updatePlayersByDiscordId(
  discordId: string,
  data: Partial<
    Pick<Player, "discordId" | "thiccEntered" | "latitude" | "longitude">
  >,
) {
  const result = await db
    .updateTable("Player")
    .set(data)
    .where("discordId", "=", discordId)
    .executeTakeFirst();
  return Number(result.numUpdatedRows);
}

export async function updatePlayerName(playerId: number, name: string) {
  await db
    .updateTable("Player")
    .set({ playerName: name })
    .where("playerId", "=", playerId)
    .execute();
}

export async function batchUpdatePlayerNames(
  updates: { playerId: number; name: string }[],
) {
  if (updates.length === 0) return;
  await db.transaction().execute(async (tx) => {
    for (const { playerId, name } of updates) {
      await tx
        .updateTable("Player")
        .set({ playerName: name })
        .where("playerId", "=", playerId)
        .execute();
    }
  });
}

export async function getBirthdays() {
  return await sql<Player>`
    SELECT * FROM "Player"
    WHERE "discordId" IS NOT NULL
      AND EXTRACT(MONTH FROM "accountCreationDate") = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM "accountCreationDate") = EXTRACT(DAY FROM CURRENT_DATE)
  `.execute(db);
}

// ── StandingOffer ──

export async function getTopOffersForItem(itemId: number, limit: number) {
  return await db
    .selectFrom("StandingOffer")
    .innerJoin("Player", "Player.playerId", "StandingOffer.buyerId")
    .selectAll("Player")
    .select([
      "StandingOffer.price",
      "StandingOffer.itemId",
      "StandingOffer.offeredAt",
    ])
    .where("StandingOffer.itemId", "=", itemId)
    .where("Player.discordId", "is not", null)
    .orderBy("StandingOffer.price", "desc")
    .orderBy("StandingOffer.offeredAt", "asc")
    .limit(limit)
    .execute();
}

export async function deleteOffer(buyerId: number, itemId: number) {
  const result = await db
    .deleteFrom("StandingOffer")
    .where("buyerId", "=", buyerId)
    .where("itemId", "=", itemId)
    .executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
}

export async function upsertOffer(
  buyerId: number,
  itemId: number,
  price: number,
) {
  const now = new Date();
  await db
    .insertInto("StandingOffer")
    .values({ buyerId, itemId, price, offeredAt: now })
    .onConflict((oc) =>
      oc.columns(["buyerId", "itemId"]).doUpdateSet({
        price,
        offeredAt: now,
      }),
    )
    .execute();
}

export async function countBetterOffers(itemId: number, price: number) {
  const result = await db
    .selectFrom("StandingOffer")
    .select(db.fn.countAll<string>().as("count"))
    .where("itemId", "=", itemId)
    .where("price", ">", BigInt(price))
    .executeTakeFirstOrThrow();
  return Number(result.count);
}

export async function getAllOffersWithBuyers() {
  return await db
    .selectFrom("StandingOffer")
    .innerJoin("Player", "Player.playerId", "StandingOffer.buyerId")
    .select([
      "StandingOffer.itemId",
      "StandingOffer.price",
      "Player.playerId",
      "Player.playerName",
    ])
    .execute();
}

// ── Reminder ──

export async function createReminder(data: {
  guildId: string | null;
  channelId: string;
  userId: string;
  messageContents: string;
  reminderDate: Date;
  interactionReplyId: string | null;
}) {
  await db.insertInto("Reminder").values(data).execute();
}

export async function deleteOldSentReminders(before: Date) {
  const result = await db
    .deleteFrom("Reminder")
    .where("reminderSent", "=", true)
    .where("reminderDate", "<", before)
    .executeTakeFirst();
  return Number(result.numDeletedRows);
}

export async function getDueReminders() {
  return await db
    .selectFrom("Reminder")
    .selectAll()
    .where("reminderDate", "<=", new Date())
    .where("reminderSent", "=", false)
    .execute();
}

export async function markReminderSent(id: number) {
  await db
    .updateTable("Reminder")
    .set({ reminderSent: true })
    .where("id", "=", id)
    .execute();
}

// ── Raid ──

export async function getParsedRaidIds() {
  return (await db.selectFrom("Raid").select("id").execute()).map((r) => r.id);
}

export async function createRaidsWithParticipation(
  raids: {
    id: number;
    clanId: number;
    participation: {
      playerId: number;
      playerName: string;
      skills: number;
      kills: number;
    }[];
  }[],
) {
  await db.transaction().execute(async (tx) => {
    for (const raid of raids) {
      await tx
        .insertInto("Raid")
        .values({ id: raid.id, clanId: raid.clanId })
        .execute();

      for (const p of raid.participation) {
        await tx
          .insertInto("Player")
          .values({ playerId: p.playerId, playerName: p.playerName })
          .onConflict((oc) => oc.column("playerId").doNothing())
          .execute();

        await tx
          .insertInto("RaidParticipation")
          .values({
            raidId: raid.id,
            playerId: p.playerId,
            skills: p.skills,
            kills: p.kills,
          })
          .execute();
      }
    }
  });
}

// ── Tag ──

export async function findTagByName(tag: string) {
  return await db
    .selectFrom("Tag")
    .selectAll()
    .where("tag", "=", tag)
    .executeTakeFirst();
}

export async function findTagByMessage(
  guildId: string,
  channelId: string,
  messageId: string,
) {
  return await db
    .selectFrom("Tag")
    .selectAll()
    .where("guildId", "=", guildId)
    .where("channelId", "=", channelId)
    .where("messageId", "=", messageId)
    .executeTakeFirst();
}

export async function getAllTagNames() {
  return (await db.selectFrom("Tag").select("tag").execute()).map((r) => r.tag);
}

export async function getAllTags() {
  return await db.selectFrom("Tag").selectAll().execute();
}

export async function deleteTag(tag: string) {
  await db.deleteFrom("Tag").where("tag", "=", tag).execute();
}

export async function replaceTag(
  existingTag: string | null,
  data: {
    tag: string;
    reason: string | null;
    messageId: string;
    channelId: string;
    guildId: string;
    createdBy: string;
  },
) {
  await db.transaction().execute(async (tx) => {
    if (existingTag) {
      await tx.deleteFrom("Tag").where("tag", "=", existingTag).execute();
    }
    await tx.insertInto("Tag").values(data).execute();
  });
}

// ── Raffle ──

export async function findRaffle(gameday: number) {
  return await db
    .selectFrom("Raffle")
    .selectAll()
    .where("gameday", "=", gameday)
    .executeTakeFirst();
}

export async function createRaffle(data: {
  gameday: number;
  firstPrize: number;
  secondPrize: number;
  messageId: string;
}) {
  await db.insertInto("Raffle").values(data).execute();
}

export async function getRafflesWithWinners() {
  const raffles = await db
    .selectFrom("Raffle")
    .selectAll()
    .orderBy("gameday", "desc")
    .execute();

  const wins = await db
    .selectFrom("RaffleWins")
    .innerJoin("Player", "Player.playerId", "RaffleWins.playerId")
    .selectAll("RaffleWins")
    .selectAll("Player")
    .execute();

  const winsByGameday = Map.groupBy(wins, (w) => w.gameday);

  return raffles.map((r) => ({
    ...r,
    winners: (winsByGameday.get(r.gameday) ?? []).map((w) => ({
      gameday: w.gameday,
      playerId: w.playerId,
      place: w.place,
      tickets: w.tickets,
      player: {
        playerId: w.playerId,
        playerName: w.playerName,
        accountCreationDate: w.accountCreationDate,
        doneWithSkills: w.doneWithSkills,
        brainiac: w.brainiac,
        discordId: w.discordId,
        latitude: w.latitude,
        longitude: w.longitude,
        thiccEntered: w.thiccEntered,
        thiccGifteeId: w.thiccGifteeId,
      },
    })),
  }));
}

export async function getRafflesForCsv() {
  const raffles = await db
    .selectFrom("Raffle")
    .selectAll()
    .orderBy("gameday", "asc")
    .execute();

  const wins = await db
    .selectFrom("RaffleWins")
    .innerJoin("Player", "Player.playerId", "RaffleWins.playerId")
    .select([
      "RaffleWins.gameday",
      "RaffleWins.place",
      "RaffleWins.tickets",
      "Player.playerId",
      "Player.playerName",
    ])
    .execute();

  const winsByGameday = Map.groupBy(wins, (w) => w.gameday);

  return raffles.map((r) => ({
    ...r,
    winners: (winsByGameday.get(r.gameday) ?? []).map((w) => ({
      place: w.place,
      tickets: w.tickets,
      player: { playerId: w.playerId, playerName: w.playerName },
    })),
  }));
}

// ── RaffleWins ──

export async function createRaffleWin(data: {
  gameday: number;
  firstPrize: number;
  secondPrize: number;
  playerId: number;
  playerName: string;
  accountCreationDate?: Date | null;
  tickets: number;
  place: number;
}) {
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("Raffle")
      .values({
        gameday: data.gameday,
        firstPrize: data.firstPrize,
        secondPrize: data.secondPrize,
        messageId: "",
      })
      .onConflict((oc) => oc.column("gameday").doNothing())
      .execute();

    await tx
      .insertInto("Player")
      .values({
        playerId: data.playerId,
        playerName: data.playerName,
        accountCreationDate: data.accountCreationDate ?? null,
      })
      .onConflict((oc) => oc.column("playerId").doNothing())
      .execute();

    await tx
      .insertInto("RaffleWins")
      .values({
        gameday: data.gameday,
        playerId: data.playerId,
        tickets: data.tickets,
        place: data.place,
      })
      .execute();
  });
}

// ── FlowerPrices ──

export async function getLatestFlowerPrices() {
  return await db
    .selectFrom("FlowerPrices")
    .selectAll()
    .orderBy("createdAt", "desc")
    .limit(1)
    .executeTakeFirst();
}

export async function createFlowerPrices(prices: {
  red: number;
  white: number;
  blue: number;
}) {
  await db.insertInto("FlowerPrices").values(prices).execute();
}

// ── FlowerPriceAlert ──

export async function deleteFlowerAlert(playerId: number) {
  await db
    .deleteFrom("FlowerPriceAlert")
    .where("playerId", "=", playerId)
    .execute();
}

export async function upsertFlowerAlert(playerId: number, price: number) {
  await db
    .insertInto("FlowerPriceAlert")
    .values({ playerId, price })
    .onConflict((oc) => oc.column("playerId").doUpdateSet({ price }))
    .execute();
}

export async function getTriggeredAlerts(prices: {
  red: number;
  white: number;
  blue: number;
}) {
  return await db
    .selectFrom("FlowerPriceAlert")
    .innerJoin("Player", "Player.playerId", "FlowerPriceAlert.playerId")
    .select([
      "FlowerPriceAlert.price",
      "Player.playerId",
      "Player.playerName",
      "Player.discordId",
    ])
    .where(
      "FlowerPriceAlert.price",
      "<=",
      Math.max(prices.red, prices.white, prices.blue),
    )
    .execute();
}
