import { LoathingDate } from "kol.js";

import { localTimeFormat } from "./localTimeFormat.js";

type Props = {
  gameday: number;
};

export default function DateSection({ gameday }: Props) {
  const ld = new LoathingDate(gameday);
  const realDate = ld.toRealDate();
  const rollover = new Date(
    LoathingDate.EPOCH.getTime() + gameday * 24 * 60 * 60 * 1000,
  );

  return (
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
      <p title="Rollover time">🌅 {localTimeFormat.format(rollover)}</p>
    </div>
  );
}
