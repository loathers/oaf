import { LoathingDate } from "kol.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const EPOCH_MS = LoathingDate.EPOCH.getTime();
const dateToGameday = (d: Date) =>
  Math.floor((d.getTime() - EPOCH_MS) / DAY_MS);

type StoreSpan = {
  addedToStore: Date | null;
  removedFromStore: Date | null;
};

// addedToStore and removedFromStore are both rollover timestamps:
// removedFromStore marks the start of the first day the item is gone.
export function getTowerOpenGamedays(
  spans: StoreSpan[],
  from: number,
  to: number,
  today: number,
): number[] {
  const days = new Set<number>();
  for (const span of spans) {
    if (!span.addedToStore) continue;
    const start = Math.max(dateToGameday(span.addedToStore), from);
    const lastOpen = span.removedFromStore
      ? dateToGameday(span.removedFromStore) - 1
      : today;
    const end = Math.min(lastOpen, to);
    for (let day = start; day <= end; day++) days.add(day);
  }
  return [...days].toSorted((a, b) => a - b);
}
