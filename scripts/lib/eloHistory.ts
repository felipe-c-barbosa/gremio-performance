import {
  parseOpenFootballSerieA,
  fetchSerieAText,
  isGremio,
  type ParsedMatch,
} from "./openfootballBrazil";
import { EloEngine, normalizeTeamKey } from "./eloEngine";

const WARMUP_START_YEAR = 2018;

type TaggedMatch = ParsedMatch & { seasonYear: number };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Reprocessa Série A (2018..throughYear) em ordem cronológica e devolve,
 * para cada rodada em que o Grêmio jogou na Série A, o Elo após o jogo.
 * Em anos sem Grêmio na A (ex.: 2022), não há chaves — o Elo do clube não
 * é atualizado nesses jogos (congelado implicitamente).
 */
export async function buildGremioEloByRound(
  throughYear: number
): Promise<Map<string, number>> {
  const matches: TaggedMatch[] = [];
  for (let y = WARMUP_START_YEAR; y <= throughYear; y++) {
    const txt = await fetchSerieAText(y);
    const parsed = parseOpenFootballSerieA(txt, y);
    for (const m of parsed) {
      matches.push({ ...m, seasonYear: y });
    }
  }

  matches.sort((a, b) => {
    const d = a.dateIso.localeCompare(b.dateIso);
    if (d !== 0) return d;
    if (a.seasonYear !== b.seasonYear) return a.seasonYear - b.seasonYear;
    return a.matchday - b.matchday;
  });

  const engine = new EloEngine();
  const out = new Map<string, number>();

  for (const m of matches) {
    engine.applyMatch(m.home, m.away, m.homeGoals, m.awayGoals);
    if (isGremio(m.home) || isGremio(m.away)) {
      const gName = isGremio(m.home) ? m.home : m.away;
      const elo = round2(engine.get(normalizeTeamKey(gName)));
      out.set(`${m.seasonYear}:${m.matchday}`, elo);
    }
  }

  return out;
}
