import { useCallback, useEffect, useMemo, useState } from "react";

import { LoathingDate } from "../../../clients/LoathingDate.js";
import DayDetail from "../components/DayDetail.js";
import GregorianCalendar from "../components/GregorianCalendar.js";
import KolCalendar from "../components/KolCalendar.js";
import type { CalendarData } from "../types/calendar.js";

type View = "gregorian" | "kol";

function getGregorianRange(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startOffset = firstOfMonth.getUTCDay();
  const start = new Date(Date.UTC(year, month, 1 - startOffset, 12));

  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const endOffset = 6 - lastOfMonth.getUTCDay();
  const end = new Date(Date.UTC(year, month + 1, endOffset, 12));

  return {
    from: LoathingDate.gameDayFromRealDate(start),
    to: LoathingDate.gameDayFromRealDate(end),
  };
}

function getKolRange(kolYear: number) {
  return {
    from: LoathingDate.getDaysSinceEpoch(kolYear, 0, 1),
    to: LoathingDate.getDaysSinceEpoch(kolYear, 11, 8),
  };
}

export default function CalendarPage() {
  const now = useMemo(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  }, []);
  const todayGameday = useMemo(() => LoathingDate.gameDayFromRealDate(now), [now]);
  const todayKolYear = useMemo(
    () => new LoathingDate(todayGameday).getYear(),
    [todayGameday],
  );

  const [view, setView] = useState<View>("gregorian");
  const [gregYear, setGregYear] = useState(now.getUTCFullYear());
  const [gregMonth, setGregMonth] = useState(now.getUTCMonth());
  const [kolYear, setKolYear] = useState(todayKolYear);
  const [selectedDay, setSelectedDay] = useState<number | null>(todayGameday);
  const [moonlightMode, setMoonlightMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("moonlight-mode", moonlightMode);
    return () => document.body.classList.remove("moonlight-mode");
  }, [moonlightMode]);

  const [data, setData] = useState<CalendarData>({ dailies: {}, raffles: {} });
  const [loading, setLoading] = useState(false);

  const range = useMemo(
    () =>
      view === "gregorian"
        ? getGregorianRange(gregYear, gregMonth)
        : getKolRange(kolYear),
    [view, gregYear, gregMonth, kolYear],
  );

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?from=${range.from}&to=${range.to}`)
      .then((r) => r.json() as Promise<CalendarData>)
      .then(setData)
      .catch(() => setData({ dailies: {}, raffles: {} }))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const navigateGregorian = useCallback(
    (delta: number) => {
      const d = new Date(Date.UTC(gregYear, gregMonth + delta, 1));
      setGregYear(d.getUTCFullYear());
      setGregMonth(d.getUTCMonth());
      setSelectedDay(null);
    },
    [gregYear, gregMonth],
  );

  const navigateKol = useCallback(
    (delta: number) => {
      setKolYear((y) => y + delta);
      setSelectedDay(null);
    },
    [],
  );

  const jumpGregorian = useCallback((year: number, month: number) => {
    setGregYear(year);
    setGregMonth(month);
    setSelectedDay(null);
  }, []);

  const jumpKol = useCallback((year: number) => {
    setKolYear(year);
    setSelectedDay(null);
  }, []);

  const jumpToToday = useCallback(() => {
    if (view === "gregorian") {
      setGregYear(now.getUTCFullYear());
      setGregMonth(now.getUTCMonth());
    } else {
      setKolYear(todayKolYear);
    }
    setSelectedDay(null);
  }, [view, now, todayKolYear]);

  return (
    <div className="calendar-page">
      <h1>KoL Calendar</h1>
      <div className="calendar-view-toggle">
        <button
          className={view === "gregorian" ? "active" : ""}
          onClick={() => {
            if (selectedDay !== null) {
              const rd = new LoathingDate(selectedDay).toRealDate();
              setGregYear(rd.getUTCFullYear());
              setGregMonth(rd.getUTCMonth());
            }
            setView("gregorian");
          }}
        >
          Gregorian
        </button>
        <button
          className={view === "kol" ? "active" : ""}
          onClick={() => {
            if (selectedDay !== null) {
              setKolYear(new LoathingDate(selectedDay).getYear());
            }
            setView("kol");
          }}
        >
          Ralphine
        </button>
        <label className="moonlight-toggle">
          <input
            type="checkbox"
            checked={moonlightMode}
            onChange={(e) => setMoonlightMode(e.target.checked)}
          />
          Moonlight
        </label>
      </div>

      {loading && <div className="calendar-loading">Loading...</div>}

      {view === "gregorian" ? (
        <GregorianCalendar
          year={gregYear}
          month={gregMonth}
          selectedDay={selectedDay}
          todayGameday={todayGameday}
          onSelectDay={setSelectedDay}
          onNavigate={navigateGregorian}
          onJump={jumpGregorian}
          onJumpToToday={jumpToToday}
          moonlightMode={moonlightMode}
        />
      ) : (
        <KolCalendar
          kolYear={kolYear}
          selectedDay={selectedDay}
          todayGameday={todayGameday}
          onSelectDay={setSelectedDay}
          onNavigate={navigateKol}
          onJump={jumpKol}
          onJumpToToday={jumpToToday}
          moonlightMode={moonlightMode}
        />
      )}

      {selectedDay !== null && (
        <DayDetail gameday={selectedDay} todayGameday={todayGameday} data={data} />
      )}
    </div>
  );
}
