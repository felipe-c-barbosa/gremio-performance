/**
 * Globo Esporte round-by-round jogos API.
 * `campeonato-brasileiro-api` only parses the current round embedded in the
 * GE homepage; this module backfills earlier (and incomplete) matchdays.
 */

import { normalizeTeamKey } from "./eloEngine";
import { mapTeamToOpenFootballName } from "./geEnrichment";
import { isGremio, type ParsedMatch } from "./openfootballBrazil";

export const SERIE_A_GAMES_PER_ROUND = 10;

export type GeJogoRaw = {
  data_realizacao: string | null;
  placar_oficial_mandante: number | null;
  placar_oficial_visitante: number | null;
  transmissao?: { broadcast?: { id?: string | null } | null } | null;
  equipes: {
    mandante: { nome_popular: string };
    visitante: { nome_popular: string };
  };
};

export function geJogosUrl(
  resourceId: string,
  phaseSlug: string,
  round: number
): string {
  return `https://api.globoesporte.globo.com/tabela/${resourceId}/fase/${phaseSlug}/rodada/${round}/jogos`;
}

function isFinishedJogo(jogo: GeJogoRaw): boolean {
  if (jogo.transmissao?.broadcast?.id !== "ENCERRADA") return false;
  return (
    typeof jogo.placar_oficial_mandante === "number" &&
    typeof jogo.placar_oficial_visitante === "number"
  );
}

export function geJogoHasFinishedGremio(jogo: GeJogoRaw): boolean {
  if (!isFinishedJogo(jogo)) return false;
  return (
    isGremio(jogo.equipes.mandante.nome_popular) ||
    isGremio(jogo.equipes.visitante.nome_popular)
  );
}

export function geJogosToParsedMatches(
  jogos: GeJogoRaw[],
  matchday: number,
  ofNames: readonly string[]
): ParsedMatch[] {
  const out: ParsedMatch[] = [];
  for (const jogo of jogos) {
    if (!isFinishedJogo(jogo)) continue;
    const dateIso = jogo.data_realizacao?.slice(0, 10);
    if (!dateIso) continue;
    out.push({
      matchday,
      dateIso,
      home: mapTeamToOpenFootballName(jogo.equipes.mandante.nome_popular, ofNames),
      away: mapTeamToOpenFootballName(
        jogo.equipes.visitante.nome_popular,
        ofNames
      ),
      homeGoals: jogo.placar_oficial_mandante as number,
      awayGoals: jogo.placar_oficial_visitante as number,
    });
  }
  return out;
}

function matchKey(m: ParsedMatch): string {
  return `${m.matchday}:${normalizeTeamKey(m.home)}:${normalizeTeamKey(m.away)}`;
}

export function mergeMatchesPreferExisting(
  primary: ParsedMatch[],
  extra: ParsedMatch[]
): ParsedMatch[] {
  const seen = new Set(primary.map(matchKey));
  const out = [...primary];
  for (const m of extra) {
    const key = matchKey(m);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export async function fetchGeRoundJogos(
  resourceId: string,
  phaseSlug: string,
  round: number
): Promise<GeJogoRaw[]> {
  const url = geJogosUrl(resourceId, phaseSlug, round);
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GE jogos round ${round}: HTTP ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`GE jogos round ${round}: expected an array`);
  }
  return data as GeJogoRaw[];
}

export type CollectGeBackfillOptions = {
  resourceId: string;
  phaseSlug: string;
  exposedRound: number;
  ofMatches: ParsedMatch[];
  ofNames: readonly string[];
  fetchJogos?: (
    resourceId: string,
    phaseSlug: string,
    round: number
  ) => Promise<GeJogoRaw[]>;
};

function scoredCountByMatchday(matches: ParsedMatch[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const m of matches) {
    counts.set(m.matchday, (counts.get(m.matchday) ?? 0) + 1);
  }
  return counts;
}

/** Finished GE matches for matchdays OpenFootball has not fully scored. */
export async function collectGeBackfillMatches(
  options: CollectGeBackfillOptions
): Promise<ParsedMatch[]> {
  const {
    resourceId,
    phaseSlug,
    exposedRound,
    ofMatches,
    ofNames,
    fetchJogos = fetchGeRoundJogos,
  } = options;

  if (!resourceId || !phaseSlug || !Number.isFinite(exposedRound) || exposedRound < 1) {
    return [];
  }

  const ofCounts = scoredCountByMatchday(ofMatches);
  const pending: Promise<ParsedMatch[]>[] = [];

  for (let round = 1; round <= exposedRound; round++) {
    if ((ofCounts.get(round) ?? 0) >= SERIE_A_GAMES_PER_ROUND) continue;
    pending.push(
      fetchJogos(resourceId, phaseSlug, round).then((jogos) =>
        geJogosToParsedMatches(jogos, round, ofNames)
      )
    );
  }

  return (await Promise.all(pending)).flat();
}
