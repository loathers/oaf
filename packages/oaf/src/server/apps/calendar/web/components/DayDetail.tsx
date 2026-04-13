import { LoathingDate } from "kol.js";
import { toWikiLink } from "kol.js";

import type { CalendarData, IotmEvent } from "../types/calendar.js";
import WardrobeSection from "./WardrobeSection.js";

const MOON_ICONS = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"];

function iotmEventSuffix(
  event: IotmEvent,
  timeFormat: Intl.DateTimeFormat,
): string {
  switch (event.type) {
    case "added":
      return " entered Mr. Store";
    case "removed":
      return " left Mr. Store";
    case "distributed": {
      const time = timeFormat.format(new Date(event.time));
      return ` distributed to subscribers (${time})`;
    }
  }
}

type Props = {
  gameday: number;
  todayGameday: number;
  data: CalendarData;
  loading?: boolean;
  visible?: boolean;
  onNavigateToDay?: () => void;
};

export default function DayDetail({
  gameday,
  todayGameday,
  data,
  loading,
  visible = true,
  onNavigateToDay,
}: Props) {
  const ld = new LoathingDate(gameday);
  const realDate = ld.toRealDate();

  const localTimeFormat = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const rollover = new Date(
    LoathingDate.EPOCH.getTime() + gameday * 24 * 60 * 60 * 1000,
  );
  const rolloverTime = localTimeFormat.format(rollover);

  const iotmEvents = data.iotmEvents[gameday];

  const DAILIES_START_GAMEDAY = 8432; // Started collecting dailies on March 13, 2026
  const isFuture = gameday > todayGameday;
  const isToday = gameday === todayGameday;
  const hasDailies = gameday >= DAILIES_START_GAMEDAY;
  const holidays = ld.getHolidays();
  const dailies = isFuture || !hasDailies ? undefined : data.dailies[gameday];
  const raffle = isFuture ? undefined : data.raffles[gameday];

  return (
    <div className={`day-detail${loading ? " day-detail-loading" : ""}`}>
      {!visible && onNavigateToDay && (
        <button className="day-detail-goto" onClick={onNavigateToDay}>
          Show in calendar
        </button>
      )}
      <div className="day-detail-section">
        <h3 title={`Day ${gameday}`}>Date</h3>
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
        <p title="Rollover time">🌅 {rolloverTime}</p>
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
              <li key={h}>
                <a href={toWikiLink(h)} target="_blank" rel="noreferrer">
                  {h}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {iotmEvents && iotmEvents.length > 0 && (
        <div className="day-detail-section">
          <h3>Mr. Store</h3>
          <ul>
            {iotmEvents.map((e, i) => (
              <li key={i}>
                {e.itemName ? (
                  <a
                    href={toWikiLink(e.itemName)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {e.itemName}
                  </a>
                ) : (
                  "Unknown item"
                )}
                {iotmEventSuffix(e, localTimeFormat)}
              </li>
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
                  <strong>{d.displayName}</strong>:{" "}
                  {d.rendered.map((seg, i) =>
                    seg.href ? (
                      <a
                        key={i}
                        href={seg.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {seg.text}
                      </a>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    ),
                  )}
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
              {([1, 2] as const).map((place) => {
                const prize =
                  place === 1 ? raffle.firstPrize : raffle.secondPrize;
                const winners = isToday
                  ? []
                  : raffle.winners.filter((w) => w.place === place);
                return (
                  <p key={place}>
                    {place === 1 ? "🥇" : "🥈"}{" "}
                    <a
                      href={toWikiLink(prize.name)}
                      target="_blank"
                      rel="noreferrer"
                    >
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
              })}
            </>
          ) : (
            <p className="no-data">No data</p>
          )}
        </div>
      )}

      <WardrobeSection gameday={gameday} />
    </div>
  );
}
