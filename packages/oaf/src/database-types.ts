import type { ColumnType, Generated, Selectable } from "kysely";

export interface PlayerTable {
  playerId: number;
  playerName: string;
  accountCreationDate: ColumnType<
    Date | null,
    Date | string | null,
    Date | string | null
  >;
  doneWithSkills: Generated<boolean>;
  brainiac: Generated<boolean>;
  discordId: string | null;
  latitude: number | null;
  longitude: number | null;
  thiccEntered: Generated<boolean>;
  thiccGifteeId: number | null;
}

export interface StandingOfferTable {
  itemId: number;
  price: ColumnType<bigint, bigint | number, bigint | number>;
  buyerId: number;
  offeredAt: ColumnType<Date, Date | undefined, Date>;
}

export interface ReminderTable {
  id: Generated<number>;
  guildId: string | null;
  channelId: string;
  userId: string;
  messageContents: string;
  reminderDate: ColumnType<Date, Date | string, Date | string>;
  interactionReplyId: string | null;
  reminderSent: Generated<boolean>;
}

export interface RaidTable {
  id: number;
  clanId: number;
}

export interface RaidParticipationTable {
  raidId: number;
  playerId: number;
  skills: number;
  kills: number;
}

export interface TagTable {
  tag: string;
  reason: string | null;
  channelId: string;
  guildId: string;
  messageId: string;
  createdAt: Generated<
    ColumnType<Date, Date | string | undefined, Date | string>
  >;
  createdBy: string;
}

export interface SettingTable {
  key: string;
  value: unknown;
}

export interface RaffleTable {
  gameday: number;
  firstPrize: number;
  secondPrize: number;
  messageId: string;
}

export interface RaffleWinsTable {
  gameday: number;
  playerId: number;
  place: number;
  tickets: number;
}

export interface FlowerPricesTable {
  id: Generated<number>;
  red: number;
  white: number;
  blue: number;
  createdAt: Generated<
    ColumnType<Date, Date | string | undefined, Date | string>
  >;
}

export interface FlowerPriceAlertTable {
  playerId: number;
  price: number;
}

export interface DB {
  Player: PlayerTable;
  StandingOffer: StandingOfferTable;
  Reminder: ReminderTable;
  Raid: RaidTable;
  RaidParticipation: RaidParticipationTable;
  Tag: TagTable;
  Setting: SettingTable;
  Raffle: RaffleTable;
  RaffleWins: RaffleWinsTable;
  FlowerPrices: FlowerPricesTable;
  FlowerPriceAlert: FlowerPriceAlertTable;
}

export type Player = Selectable<PlayerTable>;
export type StandingOffer = Selectable<StandingOfferTable>;
export type Reminder = Selectable<ReminderTable>;
export type Raid = Selectable<RaidTable>;
export type RaidParticipation = Selectable<RaidParticipationTable>;
export type Tag = Selectable<TagTable>;
export type Setting = Selectable<SettingTable>;
export type Raffle = Selectable<RaffleTable>;
export type RaffleWins = Selectable<RaffleWinsTable>;
export type FlowerPrices = Selectable<FlowerPricesTable>;
export type FlowerPriceAlert = Selectable<FlowerPriceAlertTable>;
