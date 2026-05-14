"use client";

import { useCallback, useState } from "react";
import type { SeasonData } from "@/lib/types";
import type { ComparisonYear } from "@/lib/data";
import { buildAccumulatedRows, buildPositionRows, COMPARISON_YEARS } from "@/lib/data";
import { AccumulatedPointsChart } from "./AccumulatedPointsChart";
import { PositionChart } from "./PositionChart";
import { RoundResultsChart } from "./RoundResultsChart";

type Props = {
  seasons: SeasonData[];
};

export function DashboardCharts({ seasons }: Props) {
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(() => new Set());

  const toggleYear = useCallback((year: ComparisonYear) => {
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const acc = buildAccumulatedRows(seasons);
  const pos = buildPositionRows(seasons);
  const byYear = new Map(seasons.map((s) => [s.year, s]));

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Pontos acumulados por rodada
        </h2>
        <AccumulatedPointsChart
          data={acc}
          hiddenYears={hiddenYears}
          onLegendClick={toggleYear}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Posição na tabela por rodada
        </h2>
        <PositionChart
          data={pos}
          hiddenYears={hiddenYears}
          onLegendClick={toggleYear}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Resultado em cada rodada (V / E / D)
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Uma coluna por rodada; cores por resultado do Grêmio.
        </p>
        <div className="mt-6">
          <RoundResultsChart byYear={byYear} />
        </div>
      </section>

      <footer className="text-center text-xs text-zinc-600">
        Temporadas: {COMPARISON_YEARS.join(", ")} · Dados históricos:{" "}
        <a
          className="text-[#0E72BC] underline-offset-2 hover:underline"
          href="https://github.com/openfootball/south-america/tree/master/brazil"
          target="_blank"
          rel="noreferrer"
        >
          openfootball/south-america
        </a>
        {" · "}
        Atualização 2026: OpenFootball (preferencial) ou Globo Esporte via{" "}
        <code className="rounded bg-zinc-800 px-1">campeonato-brasileiro-api</code>{" "}
        + <code className="rounded bg-zinc-800 px-1">cheerio</code> (sanidade do HTML).
      </footer>
    </div>
  );
}
