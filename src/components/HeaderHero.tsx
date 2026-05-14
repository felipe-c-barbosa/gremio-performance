import type { SeasonData } from "@/lib/types";
import { formatDateTimePt, latestRoundAcross } from "@/lib/data";

type Props = {
  seasons: SeasonData[];
};

export function HeaderHero({ seasons }: Props) {
  const s2026 = seasons.find((s) => s.year === 2026);
  const maxRound = latestRoundAcross(seasons);

  return (
    <header className="border-b border-white/10 pb-8">
      <p className="text-sm font-medium uppercase tracking-widest text-[#0E72BC]">
        Brasileirão Série A
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
        Grêmio: 2026 vs temporadas anteriores
      </h1>
      <p className="mt-4 max-w-2xl text-base text-zinc-400 sm:text-lg">
        Pontos, resultados por rodada e posição na tabela — comparando{" "}
        <strong className="text-zinc-200">2026</strong> com{" "}
        <strong className="text-zinc-200">2020, 2021, 2023, 2024 e 2025</strong>{" "}
        (2022 na Série B, fora do recorte).
      </p>
      <dl className="mt-6 flex flex-wrap gap-6 text-sm">
        <div>
          <dt className="text-zinc-500">Rodadas no gráfico</dt>
          <dd className="font-mono text-lg text-white">1–{maxRound || "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Atualização (2026)</dt>
          <dd className="font-mono text-zinc-200">
            {formatDateTimePt(s2026?.updatedAt)}
          </dd>
        </div>
      </dl>
    </header>
  );
}
