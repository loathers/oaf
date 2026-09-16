import { toWikiLink } from "kol.js";

import type { RaffleInfo } from "../types/calendar.js";

type Props = {
  gameday: number;
  todayGameday: number;
  raffle: RaffleInfo | undefined;
};

export default function RaffleSection({
  gameday,
  todayGameday,
  raffle,
}: Props) {
  if (gameday > todayGameday) return null;
  const isToday = gameday === todayGameday;

  return (
    <div className="day-detail-section">
      <h3>Raffle</h3>
      {raffle ? (
        ([1, 2] as const).map((place) => {
          const prize = place === 1 ? raffle.firstPrize : raffle.secondPrize;
          // Today's winners are not drawn yet
          const winners = isToday
            ? []
            : raffle.winners.filter((w) => w.place === place);
          return (
            <p key={place}>
              {place === 1 ? "🥇" : "🥈"}{" "}
              <a href={toWikiLink(prize.name)} target="_blank" rel="noreferrer">
                {prize.name}
              </a>
              {winners.length > 0 && (
                <>
                  {" - "}
                  {winners
                    .map(
                      (w) =>
                        `${w.playerName} (#${w.playerId}) ${w.tickets.toLocaleString()} tickets`,
                    )
                    .join(", ")}
                </>
              )}
            </p>
          );
        })
      ) : (
        <p className="no-data">No data</p>
      )}
    </div>
  );
}
