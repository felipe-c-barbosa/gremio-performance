import { delay, fetchJsonOrNull, fotmobHeaders } from "./http";
import {
  addDaysYmd,
  namesLikelyMatch,
  toYmdCompact,
} from "./matchMatcher";

/** Brasileirão Série A on FotMob (sportly / Public-FotMob-API). */
export const FOTMOB_BRASILEIRAO_LEAGUE_ID = 268;
/** From https://www.fotmob.com/teams/9769/ */
export const FOTMOB_GREMIO_TEAM_ID = 9769;

export type RatingResult = { rating: number; source: "fotmob" };

function clampRating10(x: number): number {
  if (!Number.isFinite(x) || Number.isNaN(x)) return 0;
  return Math.round(Math.min(10, Math.max(0, x)) * 100) / 100;
}

export function extractFotMobTeamRating(
  details: Record<string, unknown>,
  gremioPlayedHome: boolean
): number | null {
  const content = details.content as Record<string, unknown> | undefined;
  const lineup = content?.lineup as Record<string, unknown> | undefined;
  const tr = lineup?.teamRatings as
    | { home?: { num?: number }; away?: { num?: number } }
    | undefined;
  if (!tr) return null;
  const side = gremioPlayedHome ? tr.home : tr.away;
  const n = side?.num;
  if (typeof n === "number" && Number.isFinite(n)) return clampRating10(n);
  return null;
}

type FotMobMatchList = {
  leagues?: Array<{
    id?: number;
    primaryId?: number;
    name?: string;
    matches?: Array<{
      id: number;
      home: { id?: number; name: string; score?: number };
      away: { id?: number; name: string; score?: number };
      status?: { utcTime?: string; finished?: boolean };
    }>;
  }>;
};

function isBrasileiraoLeague(league: NonNullable<FotMobMatchList["leagues"]>[number]): boolean {
  const lid = league.primaryId ?? league.id;
  if (lid === FOTMOB_BRASILEIRAO_LEAGUE_ID) return true;
  const n = (league.name ?? "").toLowerCase();
  return n.includes("brasileir") && (n.includes("série a") || n.includes("serie a"));
}

export async function findFotMobMatchIdForRound(params: {
  dateIso: string;
  opponent: string;
  homeAway: "H" | "A";
  scoreFor: number;
  scoreAgainst: number;
}): Promise<number | null> {
  if (!params.dateIso) return null;
  const center = toYmdCompact(params.dateIso);
  const ymds = [addDaysYmd(center, -1), center, addDaysYmd(center, 1)];

  for (const ymd of ymds) {
    const url = `https://www.fotmob.com/api/matches?date=${ymd}`;
    const data = (await fetchJsonOrNull(url, fotmobHeaders())) as FotMobMatchList | null;
    if (!data?.leagues) continue;

    for (const lg of data.leagues) {
      if (!isBrasileiraoLeague(lg)) continue;
      for (const m of lg.matches ?? []) {
        if (!m.status?.finished) continue;

        const h = m.home;
        const a = m.away;
        const gHome =
          h.id === FOTMOB_GREMIO_TEAM_ID || namesLikelyMatch(h.name, "Gremio");
        const gAway =
          a.id === FOTMOB_GREMIO_TEAM_ID || namesLikelyMatch(a.name, "Gremio");

        if (params.homeAway === "H" && !gHome) continue;
        if (params.homeAway === "A" && !gAway) continue;

        const oppName = params.homeAway === "H" ? a.name : h.name;
        if (!namesLikelyMatch(oppName, params.opponent)) continue;

        const sf = params.homeAway === "H" ? h.score : a.score;
        const sa = params.homeAway === "H" ? a.score : h.score;
        if (
          typeof sf === "number" &&
          typeof sa === "number" &&
          (sf !== params.scoreFor || sa !== params.scoreAgainst)
        ) {
          continue;
        }

        return m.id;
      }
    }
  }
  return null;
}

export async function getFotMobRatingForRound(round: {
  date: string;
  opponent: string;
  homeAway: "H" | "A";
  scoreFor: number;
  scoreAgainst: number;
}): Promise<RatingResult | null> {
  await delay(600);
  const matchId = await findFotMobMatchIdForRound({
    dateIso: round.date,
    opponent: round.opponent,
    homeAway: round.homeAway,
    scoreFor: round.scoreFor,
    scoreAgainst: round.scoreAgainst,
  });
  if (matchId == null) return null;

  await delay(500);
  const details = (await fetchJsonOrNull(
    `https://www.fotmob.com/api/matchDetails?matchId=${matchId}`,
    fotmobHeaders()
  )) as Record<string, unknown> | null;
  if (!details) return null;

  const rating = extractFotMobTeamRating(details, round.homeAway === "H");
  if (rating == null) return null;
  return { rating, source: "fotmob" };
}
