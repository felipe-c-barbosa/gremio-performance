/**
 * Parser for openfootball plain-text Brasileirão Série A files
 * (e.g. openfootball/south-america brazil/YYYY_br1.txt)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { RoundEntry, SeasonData } from "../../src/lib/types";
import {
  finalizeSeasonWithElo,
  mergePreviousEloIntoRounds,
} from "./eloMerge";

const GREMIO_MARKERS = ["gremio", "grêmio"];

export type ParsedMatch = {
  matchday: number;
  dateIso: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
};

function normalizeTeamName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isGremio(name: string): boolean {
  const n = normalizeTeamName(name);
  return GREMIO_MARKERS.some((m) => n.includes(m));
}

/** Parse "Sat Aug/8 2020" or "Sun Aug/9" (inherits year from context) */
function parseDateLine(
  line: string,
  defaultYear: number
): { year: number; month: number; day: number } | null {
  const trimmed = line.trim();
  const m = trimmed.match(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w+)\/(\d{1,2})(?:\s+(\d{4}))?$/i
  );
  if (!m) return null;
  const monthStr = m[1].toLowerCase();
  const day = Number(m[2]);
  const year = m[3] ? Number(m[3]) : defaultYear;
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const month = months[monthStr.slice(0, 3) as keyof typeof months];
  if (month === undefined || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }
  return { year, month, day };
}

function toIso(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
}

/**
 * Match line: optional HH.MM prefix, Home v Away score
 * score: "1-0" or "1-0 (1-0)" half-time in parens ignored
 */
const MATCH_RE =
  /^\s*(?:(\d{1,2})\.(\d{2})\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)\s*-\s*(\d+)(?:\s*\([^)]*\))?\s*$/i;

export function parseOpenFootballSerieA(txt: string, seasonYear: number): ParsedMatch[] {
  const lines = txt.split(/\r?\n/);
  let currentMatchday = 0;
  let yearContext = seasonYear;
  const matches: ParsedMatch[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trimEnd();
    const md = line.match(/^\s*»\s*Matchday\s+(\d+)\s*$/i);
    if (md) {
      currentMatchday = Number(md[1]);
      continue;
    }

    if (!currentMatchday) continue;

    const parsedDate = parseDateLine(line, yearContext);
    if (parsedDate) {
      yearContext = parsedDate.year;
      continue;
    }

    const m = line.match(MATCH_RE);
    if (!m) continue;

    const home = m[3].trim();
    const away = m[4].trim();
    const homeGoals = Number(m[5]);
    const awayGoals = Number(m[6]);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;

    const dateLine = findPreviousDateLine(lines, li, yearContext);
    const dateIso = dateLine
      ? toIso(dateLine.year, dateLine.month, dateLine.day)
      : toIso(seasonYear, 0, 1);

    matches.push({
      matchday: currentMatchday,
      dateIso,
      home,
      away,
      homeGoals,
      awayGoals,
    });
  }

  return matches;
}

function findPreviousDateLine(
  lines: string[],
  idx: number,
  defaultYear: number
): { year: number; month: number; day: number } | null {
  for (let i = idx - 1; i >= 0; i--) {
    const d = parseDateLine(lines[i], defaultYear);
    if (d) return d;
    if (/^\s*»\s*Matchday/i.test(lines[i])) break;
  }
  return null;
}

type TeamRow = {
  name: string;
  p: number;
  gf: number;
  ga: number;
  w: number;
  d: number;
  l: number;
};

function sortTable(rows: TeamRow[]): TeamRow[] {
  return [...rows].sort((a, b) => {
    if (b.p !== a.p) return b.p - a.p;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });
}

function positionOfGremio(table: TeamRow[]): number {
  const sorted = sortTable(table);
  const idx = sorted.findIndex((r) => isGremio(r.name));
  return idx >= 0 ? idx + 1 : 20;
}

function buildTableAfterMatchdays(
  allMatches: ParsedMatch[],
  upToMatchday: number
): TeamRow[] {
  const byName = new Map<string, TeamRow>();
  const played = allMatches.filter((m) => m.matchday <= upToMatchday);

  for (const m of played) {
    for (const name of [m.home, m.away]) {
      if (!byName.has(name)) {
        byName.set(name, { name, p: 0, gf: 0, ga: 0, w: 0, d: 0, l: 0 });
      }
    }
    const h = byName.get(m.home)!;
    const a = byName.get(m.away)!;
    h.gf += m.homeGoals;
    h.ga += m.awayGoals;
    a.gf += m.awayGoals;
    a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) {
      h.p += 3;
      h.w += 1;
      a.l += 1;
    } else if (m.homeGoals < m.awayGoals) {
      a.p += 3;
      a.w += 1;
      h.l += 1;
    } else {
      h.p += 1;
      a.p += 1;
      h.d += 1;
      a.d += 1;
    }
  }

  return [...byName.values()];
}

export function buildSeasonFromMatches(
  year: number,
  allMatches: ParsedMatch[],
  options?: {
    updatedAt?: string;
    source?: string;
    previousSeason?: SeasonData | null;
  }
): SeasonData {
  const gremioMatches = allMatches.filter((m) => isGremio(m.home) || isGremio(m.away));

  const byRound = new Map<number, ParsedMatch[]>();
  for (const m of gremioMatches) {
    const list = byRound.get(m.matchday) ?? [];
    list.push(m);
    byRound.set(m.matchday, list);
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const roundEntries: RoundEntry[] = [];
  let accumulated = 0;

  for (const r of rounds) {
    const list = byRound.get(r)!;
    const gm = list.sort(
      (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime()
    )[0];

    const home = isGremio(gm.home);
    const scoreFor = home ? gm.homeGoals : gm.awayGoals;
    const scoreAgainst = home ? gm.awayGoals : gm.homeGoals;
    let result: "W" | "D" | "L";
    let pointsGained: 0 | 1 | 3;
    if (scoreFor > scoreAgainst) {
      result = "W";
      pointsGained = 3;
    } else if (scoreFor === scoreAgainst) {
      result = "D";
      pointsGained = 1;
    } else {
      result = "L";
      pointsGained = 0;
    }
    accumulated += pointsGained;
    const opponent = home ? gm.away : gm.home;
    const table = buildTableAfterMatchdays(allMatches, r);
    const tablePosition = positionOfGremio(table);
    const others = table.filter((row) => !isGremio(row.name));
    const leagueAveragePoints =
      others.length > 0
        ? Math.round((others.reduce((s, t) => s + t.p, 0) / others.length) * 100) / 100
        : null;

    roundEntries.push({
      round: r,
      date: gm.dateIso,
      opponent,
      homeAway: home ? "H" : "A",
      scoreFor,
      scoreAgainst,
      result,
      pointsGained,
      accumulatedPoints: accumulated,
      tablePosition,
      leagueAveragePoints,
    });
  }

  const lastTable =
    rounds.length > 0 ? buildTableAfterMatchdays(allMatches, Math.max(...rounds)) : [];
  const gremioRow = lastTable.find((row) => isGremio(row.name));
  const played = gremioRow ? gremioRow.w + gremioRow.d + gremioRow.l : 0;
  const maxPts = played * 3;
  const pointsPercentage =
    maxPts > 0 && gremioRow ? Math.round((gremioRow.p / maxPts) * 1000) / 10 : 0;

  const seasonComplete = roundEntries.length >= 38;

  mergePreviousEloIntoRounds(roundEntries, options?.previousSeason?.rounds);

  const data: SeasonData = {
    year,
    team: "Grêmio",
    ...(options?.updatedAt ? { updatedAt: options.updatedAt } : {}),
    ...(options?.source ? { source: options.source } : {}),
    rounds: roundEntries,
    summary: {
      played,
      wins: gremioRow?.w ?? 0,
      draws: gremioRow?.d ?? 0,
      losses: gremioRow?.l ?? 0,
      goalsFor: gremioRow?.gf ?? 0,
      goalsAgainst: gremioRow?.ga ?? 0,
      points: gremioRow?.p ?? 0,
      finalPosition: seasonComplete ? positionOfGremio(lastTable) : null,
      pointsPercentage,
    },
  };

  return finalizeSeasonWithElo(data);
}

export const OPENFOOTBALL_SERIE_A_BASE =
  "https://raw.githubusercontent.com/openfootball/south-america/master/brazil";

export async function fetchSerieAText(year: number): Promise<string> {
  const url = `${OPENFOOTBALL_SERIE_A_BASE}/${year}_br1.txt`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}

export async function buildSeasonFromOpenFootball(
  year: number,
  options?: { updatedAt?: string; source?: string }
): Promise<SeasonData> {
  const txt = await fetchSerieAText(year);
  const matches = parseOpenFootballSerieA(txt, year);
  const source = `${OPENFOOTBALL_SERIE_A_BASE}/${year}_br1.txt`;
  return buildSeasonFromMatches(year, matches, {
    ...options,
    source: options?.source ?? source,
  });
}

export function writeSeasonJson(path: string, data: SeasonData): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}
