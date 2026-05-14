import type { SeasonData } from "./types";

/** Display order: current season first, then recent years. */
export const COMPARISON_YEARS = [
  2026, 2025, 2024, 2023, 2021, 2020,
] as const;

export type ComparisonYear = (typeof COMPARISON_YEARS)[number];

export const YEAR_LINE_COLORS: Record<ComparisonYear, string> = {
  2026: "#0E72BC",
  2025: "#9ca3af",
  2024: "#78716c",
  2023: "#64748b",
  2021: "#52525b",
  2020: "#3f3f46",
};

/** Ponto de partida do método (Yuri Malheiros). */
export const ELO_BASELINE = 1000;

export function formatDateTimePt(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function latestRoundAcross(seasons: SeasonData[]): number {
  return Math.max(
    0,
    ...seasons.flatMap((s) => s.rounds.map((r) => r.round)),
    ...seasons.map((s) => s.summary.played)
  );
}

export type AccumulatedRow = {
  round: number;
} & Partial<Record<`y${ComparisonYear}`, number | null>>;

export function buildAccumulatedRows(seasons: SeasonData[]): AccumulatedRow[] {
  const byYear = new Map<number, SeasonData>();
  for (const s of seasons) {
    byYear.set(s.year, s);
  }
  const rows: AccumulatedRow[] = [];
  for (let round = 1; round <= 38; round++) {
    const row: AccumulatedRow = { round };
    for (const y of COMPARISON_YEARS) {
      const season = byYear.get(y);
      const entry = season?.rounds.find((r) => r.round === round);
      const key = `y${y}` as const;
      row[key] = entry ? entry.accumulatedPoints : null;
    }
    rows.push(row);
  }
  return rows;
}

export type PositionRow = {
  round: number;
} & Partial<Record<`y${ComparisonYear}`, number | null>>;

export function buildPositionRows(seasons: SeasonData[]): PositionRow[] {
  const byYear = new Map<number, SeasonData>();
  for (const s of seasons) {
    byYear.set(s.year, s);
  }
  const rows: PositionRow[] = [];
  for (let round = 1; round <= 38; round++) {
    const row: PositionRow = { round };
    for (const y of COMPARISON_YEARS) {
      const season = byYear.get(y);
      const entry = season?.rounds.find((r) => r.round === round);
      const key = `y${y}` as const;
      row[key] = entry ? entry.tablePosition : null;
    }
    rows.push(row);
  }
  return rows;
}

export function resultColor(result: "W" | "D" | "L"): string {
  switch (result) {
    case "W":
      return "#22c55e";
    case "D":
      return "#eab308";
    case "L":
      return "#ef4444";
  }
}

export type EloRow = {
  round: number;
} & Partial<Record<`y${ComparisonYear}`, number | null>>;

/** Elo do Grêmio após cada rodada (null se ainda sem dado). */
export function buildEloRows(seasons: SeasonData[]): EloRow[] {
  const byYear = new Map<number, SeasonData>();
  for (const s of seasons) {
    byYear.set(s.year, s);
  }
  const rows: EloRow[] = [];
  for (let round = 1; round <= 38; round++) {
    const row: EloRow = { round };
    for (const y of COMPARISON_YEARS) {
      const season = byYear.get(y);
      const entry = season?.rounds.find((r) => r.round === round);
      const key = `y${y}` as const;
      row[key] =
        entry && typeof entry.elo === "number" ? entry.elo : null;
    }
    rows.push(row);
  }
  return rows;
}

export function eloAtRound(
  season: SeasonData | undefined,
  round: number
): number | null {
  const e = season?.rounds.find((r) => r.round === round);
  if (!e || typeof e.elo !== "number") return null;
  return e.elo;
}

export type RelativeToMeanRow = {
  round: number;
} & Partial<Record<`y${ComparisonYear}`, number | null>>;

/** Pontos acumulados do Grêmio menos média dos outros 19 após cada rodada. */
export function buildRelativeToMeanRows(
  seasons: SeasonData[]
): RelativeToMeanRow[] {
  const byYear = new Map<number, SeasonData>();
  for (const s of seasons) {
    byYear.set(s.year, s);
  }
  const rows: RelativeToMeanRow[] = [];
  for (let round = 1; round <= 38; round++) {
    const row: RelativeToMeanRow = { round };
    for (const y of COMPARISON_YEARS) {
      const season = byYear.get(y);
      const entry = season?.rounds.find((r) => r.round === round);
      const key = `y${y}` as const;
      if (
        entry &&
        typeof entry.leagueAveragePoints === "number" &&
        entry.leagueAveragePoints > 0
      ) {
        row[key] = entry.accumulatedPoints - entry.leagueAveragePoints;
      } else {
        row[key] = null;
      }
    }
    rows.push(row);
  }
  return rows;
}

export function leagueContextAtRound(
  season: SeasonData | undefined,
  round: number
): {
  gremio: number;
  leagueAvg: number;
  diffPts: number;
  diffPct: number;
} | null {
  const e = season?.rounds.find((r) => r.round === round);
  if (
    !e ||
    typeof e.leagueAveragePoints !== "number" ||
    e.leagueAveragePoints <= 0
  ) {
    return null;
  }
  const gremio = e.accumulatedPoints;
  const leagueAvg = e.leagueAveragePoints;
  const diffPts = gremio - leagueAvg;
  const diffPct = (diffPts / leagueAvg) * 100;
  return { gremio, leagueAvg, diffPts, diffPct };
}
