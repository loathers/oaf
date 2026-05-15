import {
  type WardrobeItem,
  WardrobeOMatic,
} from "kol.js/domains/WardrobeOMatic";
import { useState } from "react";

const LEVEL_TIERS = [
  { label: "1-4", representative: 1 },
  { label: "5-9", representative: 5 },
  { label: "10-14", representative: 10 },
  { label: "15-19", representative: 15 },
  { label: "20+", representative: 20 },
] as const;

const SLOT_LABELS: Record<WardrobeItem["slot"], string> = {
  shirt: "Shirt",
  hat: "Hat",
  "familiar-equipment": "Familiar Equipment",
};

type Props = {
  gameday: number;
};

export default function WardrobeSection({ gameday }: Props) {
  const [tierIndex, setTierIndex] = useState(0);
  const tier = LEVEL_TIERS[tierIndex];
  const items = WardrobeOMatic.getWardrobe(gameday, tier.representative);

  return (
    <div className="day-detail-section">
      <div className="wardrobe-header">
        <h3>Wardrobe-o-Matic</h3>
        <div className="wardrobe-level-selector">
          {LEVEL_TIERS.map((t, i) => (
            <button
              key={t.label}
              className={`wardrobe-level-btn${i === tierIndex ? " active" : ""}`}
              onClick={() => setTierIndex(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="wardrobe-items">
        {items.map((item) => (
          <div key={item.slot} className="wardrobe-item">
            <img
              className="wardrobe-item-img"
              src={`https://d2uyhvukfffg5a.cloudfront.net/itemimages/${item.image}.gif`}
              alt={item.name}
            />
            <div className="wardrobe-item-info">
              <p className="wardrobe-item-name">
                <strong>{SLOT_LABELS[item.slot]}:</strong> {item.name}
              </p>
              <ul className="wardrobe-item-mods">
                {item.modifiers.map((m) => (
                  <li key={m.id}>{m.description}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
