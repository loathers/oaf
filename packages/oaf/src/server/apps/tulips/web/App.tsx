import { useCallback, useEffect, useState } from "react";

import { RANGES, type Range } from "../types.js";
import TulipCard from "./components/TulipCard.js";

type PriceEntry = {
  red: number;
  white: number;
  blue: number;
  createdAt: string;
};

const RANGE_KEYS = Object.keys(RANGES) as Range[];

function formatTime(dateStr: string, range: Range): string {
  const date = new Date(dateStr);
  switch (range) {
    case "1D":
      return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    case "1W":
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        hour: "numeric",
      });
    case "1M":
    case "YTD":
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
      });
    case "1Y":
    case "10Y":
      return date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
  }
}

const tulips = [
  {
    name: "Red Tulips",
    color: "#ef4444",
    dotColor: "#ef4444",
    key: "red" as const,
  },
  {
    name: "White Tulips",
    color: "#94a3b8",
    dotColor: "#e2e8f0",
    key: "white" as const,
  },
  {
    name: "Blue Tulips",
    color: "#3b82f6",
    dotColor: "#3b82f6",
    key: "blue" as const,
  },
];

export default function App() {
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [range, setRange] = useState<Range>("1M");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const r = await fetch(`/api/prices?range=${range}`);
      if (!r.ok) throw new Error(`Failed to fetch prices (${r.status})`);
      const data = (await r.json()) as { prices: PriceEntry[] };
      setPrices(data.prices);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    void fetchPrices();
    const id = setInterval(() => void fetchPrices(), 60_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  // Data comes back oldest-first from API
  const current = prices.at(-1) ?? null;
  const first = prices[0] ?? null;

  return (
    <div className="container">
      <h1>Floral Mercantile Exchange</h1>
      <div className="range-bar">
        {RANGE_KEYS.map((r) => (
          <button
            key={r}
            className={`range-btn ${r === range ? "active" : ""}`}
            onClick={() => setRange(r)}
          >
            {r}
          </button>
        ))}
        {lastUpdated && (
          <span className="last-updated">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      {error && <div className="error-state">{error}</div>}
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <div className="ticker-grid">
          {tulips.map((t) => (
            <TulipCard
              key={t.key}
              name={t.name}
              color={t.color}
              dotColor={t.dotColor}
              dataKey={t.key}
              current={current?.[t.key] ?? 0}
              first={first?.[t.key] ?? null}
              history={prices.map((p) => ({
                time: formatTime(p.createdAt, range),
                value: p[t.key],
              }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
