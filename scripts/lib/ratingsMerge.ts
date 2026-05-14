import type { RoundEntry, SeasonData } from "../../src/lib/types";
import { seasonDataSchema } from "../../src/lib/types";

export function mergePreviousRatingsIntoRounds(
  rounds: RoundEntry[],
  previous?: RoundEntry[] | null
): void {
  if (!previous?.length) return;
  const map = new Map(previous.map((r) => [r.round, r]));
  for (const r of rounds) {
    if (typeof r.rating === "number" && r.ratingSource) continue;
    const p = map.get(r.round);
    if (p && typeof p.rating === "number" && p.ratingSource) {
      r.rating = p.rating;
      r.ratingSource = p.ratingSource;
    }
  }
}

export function finalizeSeasonWithRatings(data: SeasonData): SeasonData {
  const rated = data.rounds.filter(
    (r): r is RoundEntry & { rating: number; ratingSource: "sofascore" | "fotmob" } =>
      typeof r.rating === "number" &&
      (r.ratingSource === "sofascore" || r.ratingSource === "fotmob")
  );
  const ratingsCovered = rated.length;
  const averageRating =
    ratingsCovered === 0
      ? null
      : Math.round(
          (rated.reduce((s, r) => s + r.rating, 0) / ratingsCovered) * 100
        ) / 100;

  return seasonDataSchema.parse({
    ...data,
    summary: {
      ...data.summary,
      averageRating,
      ratingsCovered,
    },
  });
}
