export type DailyInfo = {
  key: string;
  displayName: string;
  value: string;
  thresholdReached: boolean;
};

export type RaffleInfo = {
  firstPrize: { id: number; name: string };
  secondPrize: { id: number; name: string };
  winners: { playerName: string; place: number; tickets: number }[];
};

export type CalendarData = {
  dailies: Record<number, DailyInfo[]>;
  raffles: Record<number, RaffleInfo>;
};
