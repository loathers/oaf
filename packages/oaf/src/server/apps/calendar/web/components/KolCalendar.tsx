import { LoathingDate } from "kol.js";
import React from "react";

import { BouncingEmoji } from "./BouncingEmoji.js";
import CalendarNav from "./CalendarNav.js";
import { HOLIDAY_EMOJI } from "./holidayEmoji.js";

const MONTH_NAMES = [
  "Jarlsuary",
  "Frankuary",
  "Starch",
  "April",
  "Martinus",
  "Bill",
  "Bor",
  "Petember",
  "Carlvember",
  "Porktober",
  "Boozember",
  "Dougtember",
];

const STAT_CLASSES: Record<string, string> = {
  "Muscle Day": "stat-muscle",
  "Mysticality Day": "stat-myst",
  "Moxie Day": "stat-moxie",
};

type Props = {
  kolYear: number;
  selectedDay: number | null;
  todayGameday: number;
  onSelectDay: (gameday: number) => void;
  onNavigate: (delta: number) => void;
  onJump: (kolYear: number) => void;
  onJumpToToday: () => void;
  moonlightMode: boolean;
};

export default function KolCalendar({
  kolYear,
  selectedDay,
  todayGameday,
  onSelectDay,
  onNavigate,
  onJump,
  onJumpToToday,
  moonlightMode,
}: Props) {
  return (
    <div>
      <CalendarNav
        mode="kol"
        kolYear={kolYear}
        onNavigate={onNavigate}
        onJump={onJump}
        onJumpToToday={onJumpToToday}
      />
      <div className="calendar-grid-wrapper">
        <div className="calendar-grid kol-grid">
          <div className="calendar-header" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="calendar-header">
              {i + 1}
            </div>
          ))}
          {MONTH_NAMES.map((monthName, monthIndex) => (
            <React.Fragment key={monthIndex}>
              <div className="kol-month-label">{monthName}</div>
              {Array.from({ length: 8 }, (_, dayIndex) => {
                const gameday = LoathingDate.getDaysSinceEpoch(
                  kolYear,
                  monthIndex,
                  dayIndex + 1,
                );
                const ld = new LoathingDate(gameday);
                const isToday = gameday === todayGameday;
                const isSelected = gameday === selectedDay;
                const statDay = ld.getStatDay();
                const holidays = ld
                  .getHolidays()
                  .filter(
                    (h) =>
                      !["Muscle Day", "Mysticality Day", "Moxie Day"].includes(
                        h,
                      ),
                  );

                const classes = [
                  "calendar-cell",
                  "kol-cell",
                  isToday && "today",
                  isSelected && "selected",
                  statDay && STAT_CLASSES[statDay],
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={`${monthIndex}-${dayIndex}`}
                    className={classes}
                    style={
                      moonlightMode
                        ? ({
                            "--moonlight": ld.getMoonlight(),
                          } as React.CSSProperties)
                        : undefined
                    }
                    onClick={() => onSelectDay(gameday)}
                  >
                    {isToday && <span className="today-dot" title="Today" />}
                    <img
                      className="cell-moons"
                      src={`data:image/svg+xml,${encodeURIComponent(ld.getMoonsAsSvg())}`}
                      alt={ld.getMoonDescription()}
                    />
                    {holidays.length > 0 && (
                      <span
                        className="cell-holiday"
                        title={holidays.join(", ")}
                      >
                        {holidays.map((h) => HOLIDAY_EMOJI[h] ?? "🎉").join("")}
                      </span>
                    )}
                    {holidays.includes("April Fools Day") && <BouncingEmoji />}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
