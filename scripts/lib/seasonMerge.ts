import type { RoundEntry, SeasonData, SeasonSummary } from "../../src/lib/types";
import { seasonDataSchema } from "../../src/lib/types";

export function summaryFromRounds(rounds: RoundEntry[]): Omit<
  SeasonSummary,
  "averageElo" | "eloCovered" | "finalElo"
> {
  const played = rounds.length;
  const wins = rounds.filter((r) => r.result === "W").length;
  const draws = rounds.filter((r) => r.result === "D").length;
  const losses = rounds.filter((r) => r.result === "L").length;
  const goalsFor = rounds.reduce((s, r) => s + r.scoreFor, 0);
  const goalsAgainst = rounds.reduce((s, r) => s + r.scoreAgainst, 0);
  const points = rounds.at(-1)?.accumulatedPoints ?? 0;
  const maxPts = played * 3;
  const pointsPercentage =
    maxPts > 0 ? Math.round((points / maxPts) * 1000) / 10 : 0;

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
    finalPosition: null,
    pointsPercentage,
  };
}

/** Adds Grêmio rounds present in GE but missing from the OpenFootball-built season. */
export function mergeGeRoundsIntoSeason(
  primary: SeasonData,
  ge: SeasonData
): SeasonData {
  if (ge.rounds.length <= primary.rounds.length) {
    return primary;
  }

  const byRound = new Map(primary.rounds.map((r) => [r.round, { ...r }]));
  for (const r of ge.rounds) {
    if (!byRound.has(r.round)) {
      byRound.set(r.round, { ...r });
    }
  }

  const sortedRounds = [...byRound.values()].sort((a, b) => a.round - b.round);
  let acc = 0;
  const rounds: RoundEntry[] = sortedRounds.map((r) => {
    acc += r.pointsGained;
    return { ...r, accumulatedPoints: acc };
  });

  const primarySource = primary.source ?? "OpenFootball";
  return seasonDataSchema.parse({
    ...primary,
    updatedAt: new Date().toISOString(),
    source: `${primarySource} + ge.globo.com (rodadas extras)`,
    rounds,
    summary: summaryFromRounds(rounds),
  });
}
