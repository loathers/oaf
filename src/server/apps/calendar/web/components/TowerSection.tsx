import { toWikiLink } from "kol.js";

import { TIME_TWITCHING_TOWER } from "../../../../../timeTwitchingTower.js";

type Props = {
  gameday: number;
  towerOpenDays: number[];
};

export default function TowerSection({ gameday, towerOpenDays }: Props) {
  if (!towerOpenDays.includes(gameday)) return null;

  return (
    <div className="day-detail-section">
      <h3>{TIME_TWITCHING_TOWER}</h3>
      <p>
        ⏳ The{" "}
        <a
          href={toWikiLink(TIME_TWITCHING_TOWER)}
          target="_blank"
          rel="noreferrer"
        >
          {TIME_TWITCHING_TOWER}
        </a>{" "}
        is open
      </p>
    </div>
  );
}
