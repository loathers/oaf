import { useEffect, useRef, useState } from "react";

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type GregorianProps = {
  mode: "gregorian";
  year: number;
  month: number;
  onJump: (year: number, month: number) => void;
  onNavigate: (delta: number) => void;
  onJumpToToday: () => void;
};

type KolProps = {
  mode: "kol";
  kolYear: number;
  onJump: (kolYear: number) => void;
  onNavigate: (delta: number) => void;
  onJumpToToday: () => void;
};

type Props = GregorianProps | KolProps;

export default function CalendarNav(props: Props) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const [inputYear, setInputYear] = useState("");
  const [inputMonth, setInputMonth] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (props.mode === "gregorian") {
      setInputYear(String(props.year));
      setInputMonth(props.month);
    } else {
      setInputYear(String(props.kolYear));
    }
  }, [
    open,
    props.mode,
    props.mode === "gregorian" ? props.year : props.kolYear,
    props.mode === "gregorian" ? props.month : 0,
  ]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const year = parseInt(inputYear, 10);
    if (isNaN(year)) return;
    if (props.mode === "gregorian") {
      if (year < 2003 || (year === 2003 && inputMonth < 1)) return;
      props.onJump(year, inputMonth);
    } else {
      if (year < 1) return;
      props.onJump(year);
    }
    setOpen(false);
  }

  const label =
    props.mode === "gregorian"
      ? `${MONTH_OPTIONS[props.month]} ${props.year}`
      : `Year ${props.kolYear}`;

  const atStart =
    props.mode === "gregorian"
      ? props.year <= 2003 && props.month <= 1
      : props.kolYear <= 1;

  return (
    <div className="calendar-nav">
      <button disabled={atStart} onClick={() => props.onNavigate(-1)}>
        &larr;
      </button>
      <div className="calendar-nav-label-wrapper" ref={popupRef}>
        <button
          className="calendar-nav-label"
          onClick={() => setOpen((o) => !o)}
        >
          {label}
        </button>
        {open && (
          <form className="calendar-jump-popup" onSubmit={handleSubmit}>
            {props.mode === "gregorian" && (
              <select
                value={inputMonth}
                onChange={(e) => setInputMonth(Number(e.target.value))}
              >
                {MONTH_OPTIONS.map((m, i) => (
                  <option key={i} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              value={inputYear}
              onChange={(e) => setInputYear(e.target.value)}
              min={props.mode === "gregorian" ? 2003 : 1}
              step={1}
              autoFocus
            />
            <div className="calendar-jump-actions">
              <button type="submit">Go</button>
              <button
                type="button"
                onClick={() => {
                  props.onJumpToToday();
                  setOpen(false);
                }}
              >
                Today
              </button>
            </div>
          </form>
        )}
      </div>
      <button onClick={() => props.onNavigate(1)}>&rarr;</button>
    </div>
  );
}
