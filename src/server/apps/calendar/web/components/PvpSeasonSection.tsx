import type { PvpSeasonInfo } from "../types/calendar.js";

type Props = {
  gameday: number;
  pvpSeasons: Record<number, PvpSeasonInfo>;
};

export default function PvpSeasonSection({ gameday, pvpSeasons }: Props) {
  const season = Object.entries(pvpSeasons)
    .map(([k, v]): [number, PvpSeasonInfo] => [Number(k), v])
    .filter(([startGameday]) => startGameday <= gameday)
    .sort(([a], [b]) => b - a)[0]?.[1];

  if (!season) return null;

  return (
    <div className="day-detail-section">
      <h3>PvP Season</h3>
      <p>
        <a
          href={`https://wiki.kingdomofloathing.com/PvP_Season_History#Season_${season.seasonNumber}`}
          target="_blank"
          rel="noreferrer"
        >
          Season {season.seasonNumber}: {season.seasonName}
        </a>
      </p>
    </div>
  );
}
