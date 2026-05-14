import type { SeasonData } from "../../src/lib/types";

/** `mapKey` = `${seasonYear}:${matchday}` → Elo do Grêmio após a rodada. */
export function fillEloForSeason(
  data: SeasonData,
  eloBySeasonRound: Map<string, number>
): SeasonData {
  const year = data.year;
  for (const r of data.rounds) {
    const k = `${year}:${r.round}`;
    const elo = eloBySeasonRound.get(k);
    if (elo != null) {
      r.elo = elo;
    }
  }
  return data;
}
