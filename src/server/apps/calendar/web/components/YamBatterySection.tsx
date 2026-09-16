import { toWikiLink } from "kol.js";

import type { YamBatteryEffect } from "../types/calendar.js";

type Props = {
  effects: YamBatteryEffect[] | undefined;
};

export default function YamBatterySection({ effects }: Props) {
  if (!effects) return null;

  return (
    <div className="day-detail-section">
      <h3>
        <a href={toWikiLink("yam battery")} target="_blank" rel="noreferrer">
          Yam Battery
        </a>
      </h3>
      <ul>
        {effects.map((effect) => (
          <li key={effect.duration}>
            {effect.wikiLink ? (
              <a href={effect.wikiLink} target="_blank" rel="noreferrer">
                {effect.name}
              </a>
            ) : (
              effect.name
            )}{" "}
            (duration: {effect.duration} Adventures)
            {effect.modifiers.length > 0 && (
              <div className="yam-battery-modifiers">
                {effect.modifiers.join(", ")}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
