import type { CalendarData } from "../types/calendar.js";
import DailiesSection from "./DailiesSection.js";
import DateSection from "./DateSection.js";
import HolidaysSection from "./HolidaysSection.js";
import MoonsSection from "./MoonsSection.js";
import MrStoreSection from "./MrStoreSection.js";
import PvpSeasonSection from "./PvpSeasonSection.js";
import RaffleSection from "./RaffleSection.js";
import TowerSection from "./TowerSection.js";
import WardrobeSection from "./WardrobeSection.js";
import YamBatterySection from "./YamBatterySection.js";

type Props = {
  gameday: number;
  todayGameday: number;
  data: CalendarData;
  loading?: boolean;
  visible?: boolean;
  onNavigateToDay?: () => void;
};

export default function DayDetail({
  gameday,
  todayGameday,
  data,
  loading,
  visible = true,
  onNavigateToDay,
}: Props) {
  const isFuture = gameday > todayGameday;

  return (
    <div className={`day-detail${loading ? " day-detail-loading" : ""}`}>
      {!visible && onNavigateToDay && (
        <button
          type="button"
          className="day-detail-goto"
          onClick={onNavigateToDay}
        >
          Show in calendar
        </button>
      )}
      <DateSection gameday={gameday} />
      <MoonsSection gameday={gameday} />
      <HolidaysSection gameday={gameday} />
      <TowerSection gameday={gameday} towerOpenDays={data.towerOpenDays} />
      <MrStoreSection events={data.mrStoreItemEvents[gameday]} />
      <PvpSeasonSection gameday={gameday} pvpSeasons={data.pvpSeasons} />
      <DailiesSection
        gameday={gameday}
        todayGameday={todayGameday}
        dailies={isFuture ? undefined : data.dailies[gameday]}
      />
      <RaffleSection
        gameday={gameday}
        todayGameday={todayGameday}
        raffle={isFuture ? undefined : data.raffles[gameday]}
      />
      <YamBatterySection effects={data.yamBattery[gameday]} />
      <WardrobeSection gameday={gameday} />
    </div>
  );
}
