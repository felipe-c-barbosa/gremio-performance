"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccumulatedRow, ComparisonYear } from "@/lib/data";
import { COMPARISON_YEARS, YEAR_LINE_COLORS } from "@/lib/data";

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">Rodada {label}</p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => p.value != null)
          .map((p) => (
            <li key={p.name} className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: p.color }}>{p.name}</span>
              <span className="text-zinc-200">{p.value} pts</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

type Props = {
  data: AccumulatedRow[];
  hiddenYears: Set<number>;
  onLegendClick: (year: ComparisonYear) => void;
};

export function AccumulatedPointsChart({
  data,
  hiddenYears,
  onLegendClick,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="h-80 w-full min-w-0 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="round"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickCount={10}
              label={{ value: "Rodada", position: "bottom", fill: "#71717a", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{
                value: "Pontos acumulados",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <Tooltip content={<TooltipContent />} />
            <ReferenceLine
              y={45}
              stroke="#52525b"
              strokeDasharray="6 4"
              label={{
                value: "~45 pts (referência)",
                fill: "#71717a",
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            {COMPARISON_YEARS.map((y) => {
              const key = `y${y}` as const;
              const hide = hiddenYears.has(y);
              return (
                <Line
                  key={y}
                  type="monotone"
                  dataKey={key}
                  name={`${y}`}
                  stroke={YEAR_LINE_COLORS[y]}
                  strokeWidth={y === 2026 ? 3 : 1.5}
                  dot={false}
                  connectNulls
                  opacity={hide ? 0 : 1}
                  strokeOpacity={hide ? 0 : 1}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {COMPARISON_YEARS.map((y) => {
          const off = hiddenYears.has(y);
          return (
            <button
              key={y}
              type="button"
              onClick={() => onLegendClick(y)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                off
                  ? "border-zinc-700 text-zinc-600 line-through opacity-50"
                  : "border-white/20 text-white"
              }`}
              style={{ borderColor: off ? undefined : YEAR_LINE_COLORS[y] }}
            >
              {y}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">
        Clique nos botões acima para ocultar ou exibir uma temporada. Linha tracejada: ~45
        pontos (referência histórica aproximada da zona de rebaixamento).
      </p>
    </div>
  );
}
