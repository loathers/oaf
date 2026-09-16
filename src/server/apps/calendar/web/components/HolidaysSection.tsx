import { LoathingDate, toWikiLink } from "kol.js";

type Props = {
  gameday: number;
};

export default function HolidaysSection({ gameday }: Props) {
  const holidays = new LoathingDate(gameday).getHolidays();
  if (holidays.length === 0) return null;

  return (
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
  );
}
