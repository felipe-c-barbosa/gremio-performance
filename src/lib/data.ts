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
