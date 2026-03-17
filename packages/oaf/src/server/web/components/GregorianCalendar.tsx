import { LoathingDate } from "../../../clients/LoathingDate.js";
import CalendarNav from "./CalendarNav.js";
import { HOLIDAY_EMOJI } from "./holidayEmoji.js";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const start = new Date(
    Date.UTC(year, month, 1 - startOffset),
  );

  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const endOffset = 6 - lastOfMonth.getUTCDay();
  const end = new Date(
    Date.UTC(year, month + 1, endOffset),
  );

  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
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
          const ld = new LoathingDate(gameday);
          const isCurrentMonth = date.getUTCMonth() === month;
          const isToday = gameday === todayGameday;
          const isSelected = gameday === selectedDay;
          const statDay = ld.getStatDay();
          const holidays = ld.getHolidays().filter(
            (h) => !h.includes("Day") || !["Muscle Day", "Mysticality Day", "Moxie Day"].includes(h),
          );

          const classes = [
            "calendar-cell",
            !isCurrentMonth && "outside-month",
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
              style={moonlightMode ? { "--moonlight": ld.getMoonlight() } as React.CSSProperties : undefined}
              onClick={() => onSelectDay(gameday)}
            >
              <span className="cell-day">{date.getUTCDate()}</span>
              <img
                className="cell-moons"
                src={`data:image/svg+xml,${encodeURIComponent(ld.getMoonsAsSvg())}`}
                alt={ld.getMoonDescription()}
              />
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
