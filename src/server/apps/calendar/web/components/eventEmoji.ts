import type { MrStoreItemEvent, PvpSeasonInfo } from "../types/calendar.js";

export const HOLIDAY_EMOJI: Record<string, string> = {
  "Festival of Jarlsberg": "🪄",
  "Valentine's Day": "💕",
  "St. Sneaky Pete's Day": "🍺",
  "April Fools Day": "🤡",
  "Oyster Egg Day": "🥚",
  "El Dia De Los Muertos Borrachos": "💀",
  "Generic Summer Holiday": "☀️",
  "Dependence Day": "🎆",
  "Arrrbor Day": "🌳",
  "Labór Day": "⏰",
  Halloween: "🎃",
  "Feast of Boris": "🦃",
  Yuletide: "🎄",
  Crimbo: "🎅",
  Drunksgiving: "🍻",
  "El Dia De Los Muertos Borrachos y Agradecido": "💀🦃",
  "Black Sunday": "🌀",
  "White Wednesday": "🕳️",
  "The Comet": "☄️",
};

const MR_STORE_EVENT_EMOJI: Record<MrStoreItemEvent["type"], string> = {
  distributed: "📬",
  added: "🙂",
  removed: "🙁",
};

const MR_STORE_EVENT_VERB: Record<MrStoreItemEvent["type"], string> = {
  distributed: "distributed to subscribers",
  added: "entered Mr. Store",
  removed: "left Mr. Store",
};

export type DayEvent = { emoji: string; label: string };

export function getDayEvents(
  holidays: string[],
  mrStoreItemEvents: MrStoreItemEvent[] = [],
  pvpSeason?: PvpSeasonInfo,
): DayEvent[] {
  return [
    ...holidays.map((h) => ({ emoji: HOLIDAY_EMOJI[h] ?? "🎉", label: h })),
    ...mrStoreItemEvents.map((e) => ({
      emoji: MR_STORE_EVENT_EMOJI[e.type],
      label: `${e.itemName ?? "Unknown item"} ${MR_STORE_EVENT_VERB[e.type]}`,
    })),
    ...(pvpSeason
      ? [
          {
            emoji: "⚔️",
            label: `Season ${pvpSeason.seasonNumber}: ${pvpSeason.seasonName} started`,
          },
        ]
      : []),
  ];
}
