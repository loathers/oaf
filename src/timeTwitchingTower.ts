import { LoathingDate } from "kol.js";

// While this item is in Mr. Store, the Time-Twitching Tower is open.
// checkStore stamps addedToStore/removedFromStore with rollover timestamps:
// addedToStore is the rollover that opened the tower, removedFromStore marks
// the start of the first closed day (a removal in the future is checkStore's
// prediction that it leaves at the next rollover).
export const TIME_TWITCHING_TOOLBELT = "time-twitching toolbelt";
export const TIME_TWITCHING_TOWER = "Time-Twitching Tower";

type StoreSpan = {
  addedToStore: Date | null;
  removedFromStore: Date | null;
};

export type TowerStatus = "opened" | "open" | "closed";

export function getTowerStatus(
  toolbelt: StoreSpan | undefined,
  rollover: Date,
): TowerStatus | null {
  if (!toolbelt?.addedToStore) return null;

  const removed = toolbelt.removedFromStore?.getTime();
  if (removed !== undefined && removed < rollover.getTime()) return null;
  if (removed === rollover.getTime()) return "closed";

  return toolbelt.addedToStore.getTime() >= rollover.getTime()
    ? "opened"
    : "open";
}

export function getTowerOpenGamedays(
  spans: StoreSpan[],
  from: number,
  to: number,
  today: number,
): number[] {
  const days = new Set<number>();
  for (const span of spans) {
    if (!span.addedToStore) continue;
    const start = Math.max(
      LoathingDate.gameDayFromRealDate(span.addedToStore),
      from,
    );
    const lastOpen = span.removedFromStore
      ? LoathingDate.gameDayFromRealDate(span.removedFromStore) - 1
      : today;
    const end = Math.min(lastOpen, to);
    for (let day = start; day <= end; day++) days.add(day);
  }
  return [...days].toSorted((a, b) => a - b);
}
