/**
 * When OpenFootball lags behind Globo Esporte, extra Grêmio rounds are merged
 * without `elo` / `leagueAveragePoints`. These helpers fill those fields from
 * the GE table (league average) and by continuing the Elo engine with the
 * Grêmio matches that OF does not yet have scored.
 */

import type { RoundEntry, SeasonData } from "../../src/lib/types";
import { normalizeTeamKey } from "./eloEngine";
import type { ParsedMatch } from "./openfootballBrazil";
import { isGremio } from "./openfootballBrazil";

const GREMIO_OF_NAME = "Grêmio FBPA";

/** GE / short names → OpenFootball canonical names (normalized key → OF name). */
const GE_TO_OF_ALIASES: Record<string, string> = {
  "athletico pr": "CA Paranaense",
  "atletico pr": "CA Paranaense",
  "athletico paranaense": "CA Paranaense",
  "atletico mg": "CA Mineiro",
  "atletico mineiro": "CA Mineiro",
  bragantino: "RB Bragantino",
  "red bull bragantino": "RB Bragantino",
  "rb bragantino": "RB Bragantino",
  vasco: "CR Vasco da Gama",
  "vasco da gama": "CR Vasco da Gama",
  remo: "Clube do Remo",
  chapecoense: "Chapecoense AF",
  palmeiras: "SE Palmeiras",
  flamengo: "CR Flamengo",
  corinthians: "SC Corinthians Paulista",
  internacional: "SC Internacional",
  gremio: "Grêmio FBPA",
  mirassol: "Mirassol FC",
  botafogo: "Botafogo FR",
  cruzeiro: "Cruzeiro EC",
  bahia: "EC Bahia",
  vitoria: "EC Vitória",
  coritiba: "Coritiba FBC",
  santos: "Santos FC",
  "sao paulo": "São Paulo FC",
  fluminense: "Fluminense FC",
};

export function mapTeamToOpenFootballName(
  rawName: string,
  ofNames: readonly string[]
): string {
  const n = normalizeTeamKey(rawName);
  if (!n) return rawName;

  const alias = GE_TO_OF_ALIASES[n];
  if (alias && ofNames.includes(alias)) return alias;
  if (alias) return alias;

  const exact = ofNames.find((of) => normalizeTeamKey(of) === n);
  if (exact) return exact;

  const hits = ofNames.filter((of) => {
    const o = normalizeTeamKey(of);
    return o.includes(n) || n.includes(o);
  });
  if (hits.length === 1) return hits[0]!;

  const starts = hits.filter((of) => normalizeTeamKey(of).startsWith(n));
  if (starts.length === 1) return starts[0]!;

  return rawName;
}

/** Convert a Grêmio RoundEntry into an OpenFootball-shaped match. */
export function roundEntryToParsedMatch(
  entry: RoundEntry,
  ofNames: readonly string[]
): ParsedMatch {
  const opponent = mapTeamToOpenFootballName(entry.opponent, ofNames);
  const gremioName =
    ofNames.find((n) => isGremio(n)) ?? GREMIO_OF_NAME;

  if (entry.homeAway === "H") {
    return {
      matchday: entry.round,
      dateIso: entry.date,
      home: gremioName,
      away: opponent,
      homeGoals: entry.scoreFor,
      awayGoals: entry.scoreAgainst,
    };
  }
  return {
    matchday: entry.round,
    dateIso: entry.date,
    home: opponent,
    away: gremioName,
    homeGoals: entry.scoreAgainst,
    awayGoals: entry.scoreFor,
  };
}

/**
 * Matchdays present in OpenFootball as scored games. Supplemental GE matches
 * should only cover rounds beyond this set.
 */
export function openFootballScoredMatchdays(matches: ParsedMatch[]): Set<number> {
  return new Set(matches.map((m) => m.matchday));
}

/** Grêmio rounds missing Elo that OF has not scored yet → supplemental matches. */
export function collectSupplementalEloMatches(
  season: SeasonData,
  ofScoredMatchdays: Set<number>,
  ofNames: readonly string[]
): ParsedMatch[] {
  const out: ParsedMatch[] = [];
  for (const r of season.rounds) {
    if (ofScoredMatchdays.has(r.round)) continue;
    if (typeof r.elo === "number") continue;
    out.push(roundEntryToParsedMatch(r, ofNames));
  }
  return out;
}

export type GeTableEntry = { name: string; points: number };

export function leagueAverageFromTable(entries: GeTableEntry[]): number | null {
  const others = entries.filter((e) => !isGremio(e.name));
  if (others.length === 0) return null;
  const sum = others.reduce((s, e) => s + e.points, 0);
  return Math.round((sum / others.length) * 100) / 100;
}

export type GeMatchStatus = {
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
};

/**
 * Infer which matchday the current GE standings reflect.
 * - No finished games in the exposed round → table is after exposedRound - 1
 * - All games finished → table is after exposedRound
 * - Mixed → mid-round; returns null (unreliable for a clean snapshot)
 */
export function inferTableAfterMatchday(
  exposedRound: number,
  matches: GeMatchStatus[]
): number | null {
  if (!Number.isFinite(exposedRound) || exposedRound < 1) return null;
  if (matches.length === 0) return exposedRound > 1 ? exposedRound - 1 : null;

  const finished = matches.filter(
    (m) =>
      m.status === "finished" &&
      m.scoreHome != null &&
      m.scoreAway != null
  );
  if (finished.length === 0) {
    return exposedRound > 1 ? exposedRound - 1 : null;
  }
  if (finished.length === matches.length) {
    return exposedRound;
  }
  return null;
}

/** Fill `leagueAveragePoints` on the round the GE table currently reflects. */
export function fillLeagueAverageFromGeTable(
  season: SeasonData,
  options: {
    tableEntries: GeTableEntry[];
    exposedRound: number;
    exposedMatches: GeMatchStatus[];
  }
): SeasonData {
  const after = inferTableAfterMatchday(
    options.exposedRound,
    options.exposedMatches
  );
  if (after == null) return season;

  const avg = leagueAverageFromTable(options.tableEntries);
  if (avg == null) return season;

  const rounds = season.rounds.map((r) => {
    if (r.round !== after) return r;
    if (typeof r.leagueAveragePoints === "number") return r;
    return { ...r, leagueAveragePoints: avg };
  });

  return { ...season, rounds };
}
