import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const numberFormat = new Intl.NumberFormat();

export default function TulipCard({
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
