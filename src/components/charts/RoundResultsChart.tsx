import type { SeasonData } from "@/lib/types";
import { COMPARISON_YEARS, resultColor } from "@/lib/data";

function RoundStrip({ season }: { season: SeasonData }) {
  const byRound = new Map(season.rounds.map((r) => [r.round, r]));
  const cells = [];
  for (let r = 1; r <= 38; r++) {
    const row = byRound.get(r);
    cells.push(
      <div
        key={r}
        title={row ? `R${r}: ${row.result} vs ${row.opponent}` : `R${r}`}
        className="min-h-[28px] min-w-0 flex-1 rounded-sm"
        style={{
          backgroundColor: row ? resultColor(row.result) : "#27272a",
          opacity: row ? 1 : 0.35,
        }}
      />
    );
  }
  return (
    <div className="flex w-full gap-0.5">
      {cells}
    </div>
  );
}

type Props = {
  byYear: Map<number, SeasonData>;
};

export function RoundResultsChart({ byYear }: Props) {
  return (
    <div className="space-y-4">
      {COMPARISON_YEARS.map((y) => {
        const s = byYear.get(y);
        if (!s) return null;
        return (
          <div key={y} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm font-semibold ${y === 2026 ? "text-[#7ec8f5]" : "text-zinc-400"}`}
              >
                {y}
              </span>
              <span className="text-xs text-zinc-600">1 → 38</span>
            </div>
            <RoundStrip season={s} />
          </div>
        );
      })}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" /> Vitória
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#eab308]" /> Empate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#ef4444]" /> Derrota
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#27272a]" /> Sem jogo
        </span>
      </div>
    </div>
  );
}
