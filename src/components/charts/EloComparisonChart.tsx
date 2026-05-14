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
import type { ComparisonYear, EloRow } from "@/lib/data";
import {
  COMPARISON_YEARS,
  ELO_BASELINE,
  eloAtRound,
  YEAR_LINE_COLORS,
} from "@/lib/data";

function EloTooltip({
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
          const elo = eloAtRound(season, label);
          if (elo == null) return null;
          return (
            <li key={y} className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: YEAR_LINE_COLORS[y] }}>{y}</span>
              <span className="text-zinc-200">Elo {elo.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-zinc-500">
        Elo calculado localmente (K=20, inicial 1000). Ver README.
      </p>
    </div>
  );
}

function yDomainFromRows(rows: EloRow[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    for (const y of COMPARISON_YEARS) {
      const v = row[`y${y}` as const];
      if (typeof v === "number") {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [900, 1300];
  }
  const pad = 25;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

type Props = {
  seasons: SeasonData[];
  data: EloRow[];
  hiddenYears: Set<number>;
  onLegendClick: (year: ComparisonYear) => void;
};

export function EloComparisonChart({
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
                value: "Elo",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <Tooltip content={<EloTooltip seasons={seasons} />} />
            <ReferenceLine
              y={ELO_BASELINE}
              stroke="#52525b"
              strokeDasharray="6 4"
              label={{
                value: `${ELO_BASELINE} inicial`,
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
      <p className="text-xs text-zinc-500">
        Método descrito em{" "}
        <a
          className="text-[#0E72BC] underline-offset-2 hover:underline"
          href="https://www.yurimalheiros.com/elo-brasileirao/"
          target="_blank"
          rel="noreferrer"
        >
          yurimalheiros.com/elo-brasileirao
        </a>{" "}
        (K=20, inicial 1000, sem mando). Warm-up a partir de 2018 (OpenFootball).
      </p>
    </div>
  );
}
