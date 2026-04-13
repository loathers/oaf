import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { type Range, formatTime } from "../../types.js";

const numberFormat = new Intl.NumberFormat();

function insertGapMarkers(history: HistoryEntry[]) {
  if (history.length < 2) return history;

  const intervals = history
    .slice(1)
    .map((h, i) => h.timestamp - history[i].timestamp);
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 3;

  const result: Record<string, unknown>[] = [];
  for (let i = 0; i < history.length; i++) {
    if (i > 0 && history[i].timestamp - history[i - 1].timestamp > threshold) {
      result.push({ timestamp: history[i].timestamp - 1 });
    }
    result.push(history[i]);
  }
  return result;
}

type RawEntry = { time: string; timestamp: number; value: number };
type OHLCEntry = RawEntry & {
  open: number;
  high: number;
  low: number;
  range: [number, number];
};
type HistoryEntry = RawEntry | OHLCEntry;

function isOHLCEntry(e: HistoryEntry): e is OHLCEntry {
  return "open" in e;
}

export default function TulipCard({
  name,
  color,
  dotColor,
  current,
  first,
  history,
  dataKey,
  range,
}: {
  name: string;
  color: string;
  dotColor: string;
  current: number;
  first: number | null;
  history: HistoryEntry[];
  dataKey: string;
  range: Range;
}) {
  const bucketed = history.some(isOHLCEntry);
  const chartData = useMemo(() => insertGapMarkers(history), [history]);
  const [high, low] = history.reduce<[number | null, number | null]>(
    ([hi, lo], entry) => {
      const pointHigh = isOHLCEntry(entry) ? entry.high : entry.value;
      const pointLow = isOHLCEntry(entry) ? entry.low : entry.value;
      return [
        hi === null || pointHigh > hi ? pointHigh : hi,
        lo === null || pointLow < lo ? pointLow : lo,
      ];
    },
    [null, null],
  );
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
        <span className="tulip-unit">Chroner</span>
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
          <AreaChart data={chartData}>
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "#4a4a6a", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#1a1a3e" }}
              minTickGap={40}
              tickFormatter={(v: number) =>
                formatTime(new Date(v).toISOString(), range)
              }
            />
            <YAxis
              domain={[
                (min: number) => {
                  const m = low !== null && low < min ? low : min;
                  return Math.floor(m - (m * 0.05 || 1));
                },
                (max: number) => {
                  const m = high !== null && high > max ? high : max;
                  return Math.ceil(m + (m * 0.05 || 1));
                },
              ]}
              tick={{ fill: "#4a4a6a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={45}
              tickFormatter={(v: number) => numberFormat.format(v)}
            />
            <Tooltip
              content={({ active, payload }: TooltipContentProps) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0].payload as HistoryEntry;
                return (
                  <div className="tulip-tooltip">
                    <p className="tulip-tooltip-label">
                      {new Date(entry.time).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        ...(range === "1D" || range === "1W"
                          ? { hour: "numeric", minute: "2-digit" }
                          : range === "1M" || range === "YTD"
                            ? { hour: "numeric" }
                            : {}),
                      })}
                    </p>
                    {isOHLCEntry(entry) ? (
                      <p className="tulip-tooltip-value" style={{ color }}>
                        O: {numberFormat.format(entry.open)} H:{" "}
                        {numberFormat.format(entry.high)} L:{" "}
                        {numberFormat.format(entry.low)} C:{" "}
                        {numberFormat.format(entry.value)} meat
                      </p>
                    ) : (
                      <p className="tulip-tooltip-value" style={{ color }}>
                        {numberFormat.format(entry.value)} meat
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {bucketed && (
              <Area
                type="stepAfter"
                dataKey="range"
                stroke={color}
                strokeOpacity={0.4}
                strokeWidth={1}
                fill={`url(#gradient-${dataKey})`}
                dot={false}
                isAnimationActive={false}
                tooltipType="none"
              />
            )}
            <Area
              type="stepAfter"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill="none"
              dot={{ r: 1.5, fill: color, stroke: "none" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
