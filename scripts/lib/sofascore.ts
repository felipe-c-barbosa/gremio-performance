/**
 * SofaScore unofficial API — often returns 403 without TLS fingerprinting (curl_cffi).
 * We still try first (plan); FotMob fills gaps.
 */

import { delay, fetchJsonOrNull, sofascoreHeaders } from "./http";
import { namesLikelyMatch } from "./matchMatcher";

export const SOFASCORE_GREMIO_TEAM_ID = 1981;

export type RatingResult = { rating: number; source: "sofascore" };

function clampRating10(x: number): number {
  if (!Number.isFinite(x) || Number.isNaN(x)) return 0;
  return Math.round(Math.min(10, Math.max(0, x)) * 100) / 100;
}

type SofaEvent = {
  id?: number;
  startTimestamp?: number;
  homeTeam?: { id?: number; name?: string };
  awayTeam?: { id?: number; name?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
};

type SofaEventsPayload = { events?: SofaEvent[] };

function eventDateIso(ev: SofaEvent): string {
  const ts = ev.startTimestamp;
  if (!ts) return "";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export async function findSofaEventIdForRound(params: {
  dateIso: string;
  opponent: string;
  homeAway: "H" | "A";
  scoreFor: number;
  scoreAgainst: number;
}): Promise<number | null> {
  if (!params.dateIso) return null;
  for (let page = 0; page < 40; page++) {
    await delay(400);
    const url = `https://api.sofascore.com/api/v1/team/${SOFASCORE_GREMIO_TEAM_ID}/events/last/${page}`;
    const data = (await fetchJsonOrNull(url, sofascoreHeaders())) as SofaEventsPayload | null;
    const events = data?.events;
    if (!events?.length) {
      if (page === 0) return null;
      break;
    }

    for (const ev of events) {
      const id = ev.id;
      if (!id) continue;
      const d = eventDateIso(ev);
      if (d && d !== params.dateIso.slice(0, 10)) {
        const diff =
          Math.abs(
            new Date(d).getTime() - new Date(params.dateIso.slice(0, 10)).getTime()
          ) /
          86400000;
        if (diff > 1) continue;
      }
      const home = ev.homeTeam?.name ?? "";
      const away = ev.awayTeam?.name ?? "";
      const gHome = namesLikelyMatch(home, "Gremio");
      const gAway = namesLikelyMatch(away, "Gremio");
      if (params.homeAway === "H" && !gHome) continue;
      if (params.homeAway === "A" && !gAway) continue;
      const opp = params.homeAway === "H" ? away : home;
      if (!namesLikelyMatch(opp, params.opponent)) continue;
      const hs = ev.homeScore?.current;
      const as = ev.awayScore?.current;
      if (typeof hs === "number" && typeof as === "number") {
        const sf = params.homeAway === "H" ? hs : as;
        const sa = params.homeAway === "H" ? as : hs;
        if (sf !== params.scoreFor || sa !== params.scoreAgainst) continue;
      }
      return id;
    }
  }
  return null;
}

type SofaPlayer = {
  player?: { name?: string };
  substitute?: boolean;
  statistics?: { rating?: number };
};

type SofaLineups = {
  home?: { players?: SofaPlayer[] };
  away?: { players?: SofaPlayer[] };
};

/** Average FotMob-style rating of starters from SofaScore lineups (fallback when no team aggregate). */
export function averageStarterRatingFromLineups(
  lineups: SofaLineups,
  gremioPlayedHome: boolean
): number | null {
  const side = gremioPlayedHome ? lineups.home : lineups.away;
  const players = side?.players ?? [];
  const ratings: number[] = [];
  for (const p of players) {
    if (p.substitute) continue;
    const r = p.statistics?.rating;
    if (typeof r === "number" && r > 0 && r <= 10) ratings.push(r);
  }
  if (ratings.length < 8) return null;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return clampRating10(avg);
}

export async function getSofaScoreRatingForRound(round: {
  date: string;
  opponent: string;
  homeAway: "H" | "A";
  scoreFor: number;
  scoreAgainst: number;
}): Promise<RatingResult | null> {
  const eventId = await findSofaEventIdForRound({
    dateIso: round.date,
    opponent: round.opponent,
    homeAway: round.homeAway,
    scoreFor: round.scoreFor,
    scoreAgainst: round.scoreAgainst,
  });
  if (eventId == null) return null;

  await delay(400);
  const lineups = (await fetchJsonOrNull(
    `https://api.sofascore.com/api/v1/event/${eventId}/lineups`,
    sofascoreHeaders()
  )) as SofaLineups | null;
  if (!lineups) return null;
  const avg = averageStarterRatingFromLineups(lineups, round.homeAway === "H");
  if (avg == null) return null;
  return { rating: avg, source: "sofascore" };
}
