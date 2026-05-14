"use client";

import { useMemo } from "react";
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
import type { SeasonData } from "@/lib/types";
import type { ComparisonYear, RelativeToMeanRow } from "@/lib/data";
import {
  COMPARISON_YEARS,
  leagueContextAtRound,
  YEAR_LINE_COLORS,
} from "@/lib/data";

function RelativeTooltip({
  active,
  label,
  seasons,
}: {
  active?: boolean;
  label?: number;
  seasons: SeasonData[];
}) {
  if (!active || label == null) return null;
  const byYear = new Map(seasons.map((s) => [s.year, s]));
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">Rodada {label}</p>
      <ul className="space-y-1">
        {COMPARISON_YEARS.map((y) => {
          const season = byYear.get(y);
          const ctx = leagueContextAtRound(season, label);
          if (!ctx) return null;
          const sign = ctx.diffPts >= 0 ? "+" : "";
          const pctSign = ctx.diffPct >= 0 ? "+" : "";
          return (
            <li key={y} className="flex flex-col gap-0.5 tabular-nums">
              <span style={{ color: YEAR_LINE_COLORS[y] }} className="font-semibold">
                {y}
              </span>
              <span className="text-zinc-300">
                Grêmio {ctx.gremio} pts · média outros 19: {ctx.leagueAvg.toFixed(1)}
              </span>
              <span className="text-zinc-200">
                {sign}
                {ctx.diffPts.toFixed(1)} pts ({pctSign}
                {ctx.diffPct.toFixed(1)}%)
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-zinc-500">
        Linha: diferença em pontos vs. média dos outros 19 times (simulação OpenFootball).
      </p>
    </div>
  );
}

function yDomainFromRows(rows: RelativeToMeanRow[]): [number, number] {
  let maxAbs = 5;
  for (const row of rows) {
    for (const y of COMPARISON_YEARS) {
      const v = row[`y${y}` as const];
      if (typeof v === "number") {
        maxAbs = Math.max(maxAbs, Math.abs(v));
      }
    }
  }
  const half = Math.ceil(maxAbs / 5) * 5;
  return [-half, half];
}

type Props = {
  seasons: SeasonData[];
  data: RelativeToMeanRow[];
  hiddenYears: Set<number>;
  onLegendClick: (year: ComparisonYear) => void;
};

export function RelativeToMeanChart({
  seasons,
  data,
  hiddenYears,
  onLegendClick,
}: Props) {
  const domain = useMemo(() => yDomainFromRows(data), [data]);

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
            />
            <YAxis
              domain={domain}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{
                value: "Pts vs. média (outros 19)",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <Tooltip content={<RelativeTooltip seasons={seasons} />} />
            <ReferenceLine
              y={0}
              stroke="#52525b"
              strokeDasharray="6 4"
              label={{
                value: "média da liga",
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
    </div>
  );
}
