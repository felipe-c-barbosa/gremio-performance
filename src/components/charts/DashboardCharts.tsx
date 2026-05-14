"use client";

import { useCallback, useMemo, useState } from "react";
import type { SeasonData } from "@/lib/types";
import type { ComparisonYear } from "@/lib/data";
import {
  buildAccumulatedRows,
  buildEloRows,
  buildPositionRows,
  buildRelativeToMeanRows,
  COMPARISON_YEARS,
} from "@/lib/data";
import { AccumulatedPointsChart } from "./AccumulatedPointsChart";
import { EloComparisonChart } from "./EloComparisonChart";
import { PositionChart } from "./PositionChart";
import { RelativeToMeanChart } from "./RelativeToMeanChart";
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
  const relativeRows = useMemo(() => buildRelativeToMeanRows(seasons), [seasons]);
  const eloRows = useMemo(() => buildEloRows(seasons), [seasons]);
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
          Desempenho vs. média da Série A
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pontos a mais (ou a menos) que a média dos outros 19 times até cada rodada
          (simulação a partir de todos os jogos do OpenFootball).
        </p>
        <div className="mt-4">
          <RelativeToMeanChart
            seasons={seasons}
            data={relativeRows}
            hiddenYears={hiddenYears}
            onLegendClick={toggleYear}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Elo do clube por rodada
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Elo calculado localmente a partir dos jogos do Brasileirão (OpenFootball);
          tooltip mostra o valor após cada rodada.
        </p>
        <div className="mt-4">
          <EloComparisonChart
            seasons={seasons}
            data={eloRows}
            hiddenYears={hiddenYears}
            onLegendClick={toggleYear}
          />
        </div>
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
        Atualização 2026: OpenFootball / Globo Esporte. Elo e média da liga: ver README.
      </footer>
    </div>
  );
}
