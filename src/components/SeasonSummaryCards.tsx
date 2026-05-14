import type { SeasonData } from "@/lib/types";
import { COMPARISON_YEARS } from "@/lib/data";

function Card({
  season,
  highlight,
}: {
  season: SeasonData;
  highlight: boolean;
}) {
  const { summary, year } = season;
  const pos =
    summary.finalPosition != null
      ? `${summary.finalPosition}º`
      : "Em andamento";

  return (
    <article
      className={`rounded-xl border p-4 sm:p-5 ${
        highlight
          ? "border-[#0E72BC] bg-[#0E72BC]/10 shadow-lg shadow-[#0E72BC]/20"
          : "border-white/10 bg-zinc-900/50"
      }`}
    >
      <h3
        className={`text-lg font-bold ${highlight ? "text-[#7ec8f5]" : "text-zinc-200"}`}
      >
        {year}
        {highlight && (
          <span className="ml-2 rounded bg-[#0E72BC] px-2 py-0.5 text-xs font-semibold text-white">
            atual
          </span>
        )}
      </h3>
      <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-white">
        {summary.points}
        <span className="ml-1 text-base font-normal text-zinc-500">pts</span>
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {summary.wins}V {summary.draws}E {summary.losses}D · SG{" "}
        {summary.goalsFor - summary.goalsAgainst >= 0 ? "+" : ""}
        {summary.goalsFor - summary.goalsAgainst}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Aproveitamento:{" "}
        <span className="text-zinc-300">{summary.pointsPercentage}%</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Posição: <span className="text-zinc-300">{pos}</span>
      </p>
      {summary.finalElo != null &&
      summary.averageElo != null &&
      summary.eloCovered != null ? (
        <p className="mt-1 text-xs text-zinc-500">
          Elo final:{" "}
          <span className="text-zinc-300">
            {summary.finalElo.toFixed(2)} · médio {summary.averageElo.toFixed(2)} (
            {summary.eloCovered}/{summary.played} rodadas)
          </span>
        </p>
      ) : null}
    </article>
  );
}

type Props = {
  byYear: Map<number, SeasonData>;
};

export function SeasonSummaryCards({ byYear }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Resumo por temporada</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {COMPARISON_YEARS.map((y) => {
          const s = byYear.get(y);
          if (!s) return null;
          return <Card key={y} season={s} highlight={y === 2026} />;
        })}
      </div>
    </section>
  );
}
