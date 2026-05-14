import type { RoundEntry, SeasonData } from "../../src/lib/types";
import { seasonDataSchema } from "../../src/lib/types";

export function mergePreviousEloIntoRounds(
  rounds: RoundEntry[],
  previous?: RoundEntry[] | null
): void {
  if (!previous?.length) return;
  const map = new Map(previous.map((r) => [r.round, r]));
  for (const r of rounds) {
    const p = map.get(r.round);
    if (typeof r.elo !== "number" && p && typeof p.elo === "number") {
      r.elo = p.elo;
    }
    if (
      typeof r.leagueAveragePoints !== "number" &&
      p &&
      typeof p.leagueAveragePoints === "number"
    ) {
      r.leagueAveragePoints = p.leagueAveragePoints;
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function finalizeSeasonWithElo(data: SeasonData): SeasonData {
  const withElo = data.rounds.filter(
    (r): r is RoundEntry & { elo: number } =>
      typeof r.elo === "number" && Number.isFinite(r.elo)
  );
  const eloCovered = withElo.length;
  const averageElo =
    eloCovered === 0
      ? null
      : round2(withElo.reduce((s, r) => s + r.elo, 0) / eloCovered);

  let finalElo: number | null = null;
  for (let i = data.rounds.length - 1; i >= 0; i--) {
    const e = data.rounds[i]!.elo;
    if (typeof e === "number" && Number.isFinite(e)) {
      finalElo = round2(e);
      break;
    }
  }

  return seasonDataSchema.parse({
    ...data,
    summary: {
      ...data.summary,
      averageElo,
      eloCovered,
      finalElo,
    },
  });
}
