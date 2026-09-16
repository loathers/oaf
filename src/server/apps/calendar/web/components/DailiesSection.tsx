import type { DailyInfo } from "../types/calendar.js";

const DAILIES_START_GAMEDAY = 8432; // Started collecting dailies on March 13, 2026

type Props = {
  gameday: number;
  todayGameday: number;
  dailies: DailyInfo[] | undefined;
};

export default function DailiesSection({
  gameday,
  todayGameday,
  dailies,
}: Props) {
  const isFuture = gameday > todayGameday;
  if (isFuture || gameday < DAILIES_START_GAMEDAY) return null;

  return (
    <div className="day-detail-section">
      <h3>Dailies</h3>
      {dailies && dailies.length > 0 ? (
        <ul>
          {dailies.map((d) => (
            <li key={d.key}>
              <strong>{d.displayName}</strong>:{" "}
              {d.rendered.map((seg) =>
                seg.href ? (
                  <a
                    key={`${seg.text}-${seg.href}`}
                    href={seg.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {seg.text}
                  </a>
                ) : (
                  <span key={seg.text}>{seg.text}</span>
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
  );
}
