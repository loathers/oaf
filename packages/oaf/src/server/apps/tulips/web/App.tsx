import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PriceEntry = {
  red: number;
  white: number;
  blue: number;
  createdAt: string;
};

type Range = "1D" | "1W" | "1M" | "YTD" | "1Y" | "10Y";
const RANGES: Range[] = ["1D", "1W", "1M", "YTD", "1Y", "10Y"];

const numberFormat = new Intl.NumberFormat();

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

function TulipCard({
  name,
  color,
  dotColor,
  current,
  first,
  history,
  dataKey,
}: {
  name: string;
  color: string;
  dotColor: string;
  current: number;
  first: number | null;
  history: { time: string; value: number }[];
  dataKey: string;
}) {
  const values = history.map((h) => h.value);
  const high = values.length ? Math.max(...values) : null;
  const low = values.length ? Math.min(...values) : null;
  const change = first !== null ? current - first : null;
  const pctChange = change !== null && first ? (change / first) * 100 : null;
  const direction =
    change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";

  return (
    <div className={`tulip-card ${direction}`}>
      <div className="tulip-header">
        <span className="tulip-dot" style={{ background: dotColor }} />
        <span className="tulip-name">{name}</span>
        <span className="tulip-ticker">{dataKey.toUpperCase()}</span>
      </div>
      <div className="tulip-price">{numberFormat.format(current)}</div>
      <div className="tulip-meta">
        <span className="tulip-unit">meat</span>
        {change !== null && (
          <span className={`tulip-change ${direction}`}>
            {direction === "up"
              ? "\u25B2"
              : direction === "down"
                ? "\u25BC"
                : ""}{" "}
            {change > 0 ? "+" : ""}
            {numberFormat.format(change)}
            {pctChange !== null && (
              <>
                {" "}
                ({pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(2)}%)
              </>
            )}
          </span>
        )}
        {high !== null && low !== null && (
          <span className="tulip-range">
            L: {numberFormat.format(low)} / H: {numberFormat.format(high)}
          </span>
        )}
      </div>
      <div className="tulip-chart">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history}>
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tick={{ fill: "#4a4a6a", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#1a1a3e" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[
                (min: number) => Math.floor(min - (min * 0.05 || 1)),
                (max: number) => Math.ceil(max + (max * 0.05 || 1)),
              ]}
              tick={{ fill: "#4a4a6a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={45}
              tickFormatter={(v: number) => numberFormat.format(v)}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a2e",
                border: "1px solid #2a2a4e",
                borderRadius: "4px",
                fontSize: "0.75rem",
              }}
              labelStyle={{ color: "#8892b0" }}
              itemStyle={{ color }}
              formatter={(value) => [
                numberFormat.format(value as number),
                "meat",
              ]}
            />
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#gradient-${dataKey})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [range, setRange] = useState<Range>("1M");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const r = await fetch(`/api/prices?range=${range}`);
      const data = (await r.json()) as { prices: PriceEntry[] };
      setPrices(data.prices);
      setLastUpdated(new Date());
    } catch {
      // ignore
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

  return (
    <div className="container">
      <h1>Floral Mercantile Exchange</h1>
      <div className="range-bar">
        {RANGES.map((r) => (
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
