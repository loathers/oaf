import { LoathingDate } from "kol.js";

const MOON_ICONS = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"];

type Props = {
  gameday: number;
};

export default function MoonsSection({ gameday }: Props) {
  const ld = new LoathingDate(gameday);

  return (
    <div className="day-detail-section">
      <h3>Moons</h3>
      <p>
        {MOON_ICONS[ld.getRonaldPhase()]} Ronald:{" "}
        {ld.getRonaldPhaseDescription()}
      </p>
      <p>
        {MOON_ICONS[ld.getGrimacePhase()]} Grimace:{" "}
        {ld.getGrimacePhaseDescription()}
      </p>
      {ld.getHamburglarPhase() !== null && (
        <p>Hamburglar: {ld.getHamburglarPhaseDescription()}</p>
      )}
      <p>Total moonlight: {ld.getMoonlight()}</p>
    </div>
  );
}
