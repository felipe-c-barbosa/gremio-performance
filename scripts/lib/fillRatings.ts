import type { SeasonData } from "../../src/lib/types";
import { getFotMobRatingForRound } from "./fotmob";
import { getSofaScoreRatingForRound } from "./sofascore";

function ratingsDisabled(): boolean {
  return process.env.SOFASCORE_RATINGS_DISABLED === "1";
}

export type FillRatingsOptions = {
  /** Só preenche até esta rodada (útil para teste local no seed). */
  maxRound?: number;
};

/**
 * Fetches SofaScore (then FotMob) for any round missing `rating`.
 * Swallows errors — never throws (safe for GitHub Actions).
 */
export async function fillMissingRatingsForSeason(
  data: SeasonData,
  options?: FillRatingsOptions
): Promise<SeasonData> {
  if (ratingsDisabled()) return data;

  const cap = options?.maxRound;

  for (const r of data.rounds) {
    if (cap != null && r.round > cap) continue;
    if (typeof r.rating === "number" && r.ratingSource) continue;
    try {
      let res = await getSofaScoreRatingForRound({
        date: r.date,
        opponent: r.opponent,
        homeAway: r.homeAway,
        scoreFor: r.scoreFor,
        scoreAgainst: r.scoreAgainst,
      });
      if (!res) {
        res = await getFotMobRatingForRound({
          date: r.date,
          opponent: r.opponent,
          homeAway: r.homeAway,
          scoreFor: r.scoreFor,
          scoreAgainst: r.scoreAgainst,
        });
      }
      if (res) {
        r.rating = res.rating;
        r.ratingSource = res.source;
      }
    } catch (e) {
      console.warn(`Rating skip R${r.round}:`, (e as Error).message);
    }
  }
  return data;
}
