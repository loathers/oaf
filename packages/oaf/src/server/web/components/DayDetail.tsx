import { LoathingDate } from "../../../clients/LoathingDate.js";
import type { CalendarData } from "../types/calendar.js";

const MOON_ICONS = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"];

type Props = {
  gameday: number;
  todayGameday: number;
  data: CalendarData;
};

export default function DayDetail({ gameday, todayGameday, data }: Props) {
  const ld = LoathingDate.fromGameday(gameday);
  const realDate = new Date(
    LoathingDate.EPOCH.getTime() + gameday * 1000 * 60 * 60 * 24,
  );

  const DAILIES_START_GAMEDAY = 8441; // Started collecting dailies on March 13, 2026
  const isFuture = gameday > todayGameday;
  const isToday = gameday === todayGameday;
  const hasDailies = gameday >= DAILIES_START_GAMEDAY;
  const holidays = ld.getHolidays();
  const dailies = isFuture || !hasDailies ? undefined : data.dailies[gameday];
  const raffle = isFuture ? undefined : data.raffles[gameday];

  return (
    <div className="day-detail">
      <div className="day-detail-section">
        <h3>Date</h3>
        <p>
          {realDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </p>
        <p>{ld.toString()}</p>
      </div>

      <div className="day-detail-section">
        <h3>Moons</h3>
        <p>
          {MOON_ICONS[ld.getRonaldPhase()]} Ronald:{" "}
          {ld.getRonaldPhaseDescription()}
        </p>
        <p>
          {MOON_ICONS[ld.getGrimacePhase()]} Grimace:{" "}
          {ld.getGrimacePhaseDescription()}
        </p>
        {ld.getHamburglarPhase() !== null && (
          <p>Hamburglar: {ld.getHamburglarPhaseDescription()}</p>
        )}
        <p>Total moonlight: {ld.getMoonlight()}</p>
      </div>

      {holidays.length > 0 && (
        <div className="day-detail-section">
          <h3>Holidays</h3>
          <ul>
            {holidays.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {!isFuture && hasDailies && (
        <div className="day-detail-section">
          <h3>Dailies</h3>
          {dailies && dailies.length > 0 ? (
            <ul>
              {dailies.map((d) => (
                <li key={d.key}>
                  <strong>{d.displayName}</strong>: {d.value}
                  {!d.thresholdReached && " (unconfirmed)"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No data</p>
          )}
        </div>
      )}

      {!isFuture && (
        <div className="day-detail-section">
          <h3>Raffle</h3>
          {raffle ? (
            <>
              <p>
                1st prize: {raffle.firstPrize.name} | 2nd prize:{" "}
                {raffle.secondPrize.name}
              </p>
              {!isToday && raffle.winners.length > 0 && (
                <ul>
                  {raffle.winners.map((w, i) => (
                    <li key={i}>
                      {w.place === 1 ? "1st" : "2nd"}: {w.playerName} (
                      {w.tickets} ticket{w.tickets !== 1 ? "s" : ""})
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="no-data">No data</p>
          )}
        </div>
      )}
    </div>
  );
}
