type Clan = {
  name: string;
  synonyms: string[];
  id: number;
};

export const DREAD_CLANS: Clan[] = [
  {
    name: "Collaborative Dungeon Running 1",
    synonyms: ["cdr1", "1"],
    id: 2047008362,
  },
  {
    name: "Collaborative Dungeon Running 2",
    synonyms: ["cdr2", "2"],
    id: 2047008363,
  },
];

export const NON_DREAD_CLANS: Clan[] = [
  {
    name: "Collaborative Dungeon Running Central",
    synonyms: ["central"],
    id: 2047008364,
  },
];

export const ALL_CLANS = DREAD_CLANS.concat(NON_DREAD_CLANS);

export type PlayerData = {
  id?: number;
  kills: number;
  skills: number;
  brainiac: boolean;
};

export const clanState = {
  parsedRaids: [] as string[],
  killMap: new Map<string, PlayerData>(),
};
