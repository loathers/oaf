import { toWikiLink } from "kol.js";

import type { MrStoreItemEvent } from "../types/calendar.js";
import { localTimeFormat } from "./localTimeFormat.js";

function suffix(event: MrStoreItemEvent): string {
  switch (event.type) {
    case "added":
      return " entered Mr. Store";
    case "removed":
      return " left Mr. Store";
    case "distributed": {
      const time = localTimeFormat.format(new Date(event.time));
      return ` distributed to subscribers (${time})`;
    }
  }
}

type Props = {
  events: MrStoreItemEvent[] | undefined;
};

export default function MrStoreSection({ events }: Props) {
  if (!events || events.length === 0) return null;

  return (
    <div className="day-detail-section">
      <h3>Mr. Store</h3>
      <ul>
        {events.map((e, i) => (
          <li key={i}>
            {e.itemName ? (
              <a href={toWikiLink(e.itemName)} target="_blank" rel="noreferrer">
                {e.itemName}
              </a>
            ) : (
              "Unknown item"
            )}
            {suffix(e)}
          </li>
        ))}
      </ul>
    </div>
  );
}
