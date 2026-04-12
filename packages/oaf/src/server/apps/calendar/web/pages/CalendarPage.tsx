import { LoathingDate } from "kol.js";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DayDetail from "../components/DayDetail.js";
import GregorianCalendar from "../components/GregorianCalendar.js";
import KolCalendar from "../components/KolCalendar.js";
import type { CalendarData } from "../types/calendar.js";

const MoonOrbits = lazy(() => import("../components/MoonOrbits.js"));

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

function getGamedayFromHash(): number | null {
  const hash = window.location.hash.replace("#", "");
  const n = Number(hash);
  return hash && Number.isInteger(n) ? n : null;
}

export default function CalendarPage() {
  const now = useMemo(() => {
    const d = new Date();
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12),
    );
  }, []);
  const todayGameday = useMemo(
    () => LoathingDate.gameDayFromRealDate(now),
    [now],
  );
  const todayKolYear = useMemo(
    () => new LoathingDate(todayGameday).getYear(),
    [todayGameday],
  );

  const initialDay = getGamedayFromHash() ?? todayGameday;
  const initialLd = new LoathingDate(initialDay);
  const initialRd = initialLd.toRealDate();

  const [view, setView] = useState<View>("gregorian");
  const [gregYear, setGregYear] = useState(initialRd.getUTCFullYear());
  const [gregMonth, setGregMonth] = useState(initialRd.getUTCMonth());
  const [kolYear, setKolYear] = useState(initialLd.getYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(initialDay);
  const [moonlightMode, setMoonlightMode] = useState(false);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    if (selectedDay !== null) {
      window.history.replaceState(null, "", `#${selectedDay}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [selectedDay]);

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
    },
    [gregYear, gregMonth],
  );

  const navigateKol = useCallback((delta: number) => {
    setKolYear((y) => y + delta);
  }, []);

  const navigateTo = useCallback((ld: LoathingDate) => {
    const rd = ld.toRealDate();
    setGregYear(rd.getUTCFullYear());
    setGregMonth(rd.getUTCMonth());
    setKolYear(ld.getYear());
  }, []);

  const jumpGregorian = useCallback(
    (year: number, month: number) => {
      navigateTo(new LoathingDate(new Date(Date.UTC(year, month, 15))));
    },
    [navigateTo],
  );

  const jumpKol = useCallback(
    (year: number) => {
      navigateTo(new LoathingDate(year, 0, 1));
    },
    [navigateTo],
  );

  const jumpToToday = useCallback(() => {
    navigateTo(new LoathingDate(todayGameday));
    setSelectedDay(todayGameday);
  }, [navigateTo, todayGameday]);

  useEffect(() => {
    const onHashChange = () => {
      const day = getGamedayFromHash();
      if (day !== null) {
        setSelectedDay(day);
        navigateTo(new LoathingDate(day));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [navigateTo]);

  return (
    <div className="calendar-page">
      <h1>KoL Calendar</h1>
      <div className="calendar-view-toggle">
        <button
          className={view === "gregorian" ? "active" : ""}
          onClick={() => {
            if (selectedDay !== null) navigateTo(new LoathingDate(selectedDay));
            setView("gregorian");
          }}
        >
          Gregorian
        </button>
        <button
          className={view === "kol" ? "active" : ""}
          onClick={() => {
            if (selectedDay !== null) navigateTo(new LoathingDate(selectedDay));
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
        <button onClick={() => setShow3D(true)} title="Orrery">
          🔭
        </button>
      </div>

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
        <DayDetail
          gameday={selectedDay}
          todayGameday={todayGameday}
          data={data}
          loading={loading}
          visible={selectedDay >= range.from && selectedDay <= range.to}
          onNavigateToDay={() => navigateTo(new LoathingDate(selectedDay))}
        />
      )}

      {show3D && (
        <Suspense fallback={null}>
          <MoonOrbits onClose={() => setShow3D(false)} />
        </Suspense>
      )}
    </div>
  );
}
