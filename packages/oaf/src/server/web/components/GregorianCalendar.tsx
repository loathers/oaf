import { LoathingDate } from "kol.js";

import CalendarNav from "./CalendarNav.js";
import { HOLIDAY_EMOJI } from "./holidayEmoji.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_IMAGES = new Map<number, string>([
  [LoathingDate.BLACK_SUNDAY, "/vortex.gif"],
  [LoathingDate.WHITE_WEDNESDAY, "/rift.gif"],
  [LoathingDate.COLLISION, "/comet.gif"],
]);

const STAT_CLASSES: Record<string, string> = {
  "Muscle Day": "stat-muscle",
  "Mysticality Day": "stat-myst",
  "Moxie Day": "stat-moxie",
};

type Props = {
  year: number;
  month: number;
  selectedDay: number | null;
  todayGameday: number;
  onSelectDay: (gameday: number) => void;
  onNavigate: (delta: number) => void;
  onJump: (year: number, month: number) => void;
  onJumpToToday: () => void;
  moonlightMode: boolean;
};

function getGridDates(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startOffset = firstOfMonth.getUTCDay();
  const start = new Date(Date.UTC(year, month, 1 - startOffset));

  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const endOffset = 6 - lastOfMonth.getUTCDay();
  const end = new Date(Date.UTC(year, month + 1, endOffset));

  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  // Pad to 42 cells (6 weeks) to prevent layout jumps
  while (dates.length < 42) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export default function GregorianCalendar({
  year,
  month,
  selectedDay,
  todayGameday,
  onSelectDay,
  onNavigate,
  onJump,
  onJumpToToday,
  moonlightMode,
}: Props) {
  const dates = getGridDates(year, month);

  return (
    <div>
      <CalendarNav
        mode="gregorian"
        year={year}
        month={month}
        onNavigate={onNavigate}
        onJump={onJump}
        onJumpToToday={onJumpToToday}
      />
      <div className="calendar-grid-wrapper">
        <div className="calendar-grid gregorian-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="calendar-header">
              {d}
            </div>
          ))}
          {dates.map((date) => {
            const noon = new Date(date.getTime() + 12 * 60 * 60 * 1000);
            const gameday = LoathingDate.gameDayFromRealDate(noon);
            const preEpoch = gameday < 0;
            const ld = preEpoch ? null : new LoathingDate(gameday);
            const isCurrentMonth = date.getUTCMonth() === month;
            const isToday = !preEpoch && gameday === todayGameday;
            const isSelected = !preEpoch && gameday === selectedDay;
            const statDay = ld?.getStatDay() ?? null;
            const eventImage = preEpoch ? null : EVENT_IMAGES.get(gameday);
            const holidays =
              ld
                ?.getHolidays()
                .filter(
                  (h) =>
                    !h.includes("Day") ||
                    !["Muscle Day", "Mysticality Day", "Moxie Day"].includes(h),
                ) ?? [];

            const classes = [
              "calendar-cell",
              (!isCurrentMonth || preEpoch) && "outside-month",
              preEpoch && "pre-epoch",
              isToday && "today",
              isSelected && "selected",
              statDay && STAT_CLASSES[statDay],
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={date.toISOString()}
                className={classes}
                style={
                  {
                    ...(moonlightMode && ld
                      ? { "--moonlight": ld.getMoonlight() }
                      : {}),
                    ...(eventImage
                      ? { backgroundImage: `url(${eventImage})` }
                      : {}),
                  } as React.CSSProperties
                }
                onClick={preEpoch ? undefined : () => onSelectDay(gameday)}
              >
                <span className="cell-day">{date.getUTCDate()}</span>
                {preEpoch && <span className="cell-yore">Days of Yore</span>}
                {ld && (
                  <img
                    className="cell-moons"
                    src={`data:image/svg+xml,${encodeURIComponent(ld.getMoonsAsSvg())}`}
                    alt={ld.getMoonDescription()}
                  />
                )}
                {holidays.length > 0 && (
                  <span className="cell-holiday" title={holidays.join(", ")}>
                    {holidays.map((h) => HOLIDAY_EMOJI[h] ?? "🎉").join("")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
