import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SERIE_A_GAMES_PER_ROUND,
  collectGeBackfillMatches,
  geJogosToParsedMatches,
  geJogosUrl,
  mergeMatchesPreferExisting,
  type GeJogoRaw,
} from "./geRoundApi";
import { buildSeasonFromMatches, type ParsedMatch } from "./openfootballBrazil";

const OF_NAMES = [
  "Grêmio FBPA",
  "Botafogo FR",
  "Fluminense FC",
  "São Paulo FC",
  "Mirassol FC",
  "Clube do Remo",
] as const;

function jogo(
  home: string,
  away: string,
  score: [number, number] | null,
  date: string | null,
  broadcast?: string
): GeJogoRaw {
  return {
    data_realizacao: date,
    placar_oficial_mandante: score ? score[0] : null,
    placar_oficial_visitante: score ? score[1] : null,
    transmissao: broadcast
      ? { broadcast: { id: broadcast } }
      : undefined,
    equipes: {
      mandante: { nome_popular: home },
      visitante: { nome_popular: away },
    },
  };
}

describe("geJogosUrl", () => {
  it("builds the globoesporte round jogos endpoint", () => {
    assert.equal(
      geJogosUrl("abc", "fase-unica-campeonato-brasileiro-2026", 20),
      "https://api.globoesporte.globo.com/tabela/abc/fase/fase-unica-campeonato-brasileiro-2026/rodada/20/jogos"
    );
  });
});

describe("geJogosToParsedMatches", () => {
  it("keeps finished matches and maps GE names to OpenFootball names", () => {
    const parsed = geJogosToParsedMatches(
      [
        jogo("Grêmio", "Fluminense", [1, 1], "2026-07-26T18:30", "ENCERRADA"),
        jogo("Botafogo", "Grêmio", null, null),
      ],
      20,
      OF_NAMES
    );
    assert.equal(parsed.length, 1);
    assert.deepEqual(parsed[0], {
      matchday: 20,
      dateIso: "2026-07-26",
      home: "Grêmio FBPA",
      away: "Fluminense FC",
      homeGoals: 1,
      awayGoals: 1,
    });
  });

  it("skips unplayed and live matches", () => {
    const parsed = geJogosToParsedMatches(
      [
        jogo("Botafogo", "Grêmio", null, null),
        jogo("São Paulo", "Santos", [0, 0], "2026-07-29T17:00", "AO_VIVO"),
      ],
      21,
      OF_NAMES
    );
    assert.equal(parsed.length, 0);
  });
});

describe("mergeMatchesPreferExisting", () => {
  it("adds GE matches that OpenFootball does not have", () => {
    const of: ParsedMatch[] = [
      {
        matchday: 20,
        dateIso: "2026-07-25",
        home: "CA Paranaense",
        away: "SC Internacional",
        homeGoals: 2,
        awayGoals: 0,
      },
    ];
    const ge: ParsedMatch[] = [
      of[0]!,
      {
        matchday: 20,
        dateIso: "2026-07-26",
        home: "Grêmio FBPA",
        away: "Fluminense FC",
        homeGoals: 1,
        awayGoals: 1,
      },
    ];
    const merged = mergeMatchesPreferExisting(of, ge);
    assert.equal(merged.length, 2);
  });
});

describe("collectGeBackfillMatches", () => {
  it("fetches only incomplete matchdays up to the exposed round", async () => {
    const fetched: number[] = [];
    const of: ParsedMatch[] = Array.from({ length: SERIE_A_GAMES_PER_ROUND }, (_, i) => ({
      matchday: 18,
      dateIso: "2026-05-30",
      home: `Home ${i}`,
      away: `Away ${i}`,
      homeGoals: 1,
      awayGoals: 0,
    }));

    const extra = await collectGeBackfillMatches({
      resourceId: "id",
      phaseSlug: "fase",
      exposedRound: 21,
      ofMatches: of,
      ofNames: OF_NAMES,
      fetchJogos: async (_id, _phase, round) => {
        fetched.push(round);
        if (round === 20) {
          return [jogo("Grêmio", "Fluminense", [1, 1], "2026-07-26T18:30", "ENCERRADA")];
        }
        if (round === 21) {
          return [
            jogo("Mirassol", "Remo", [2, 1], "2026-07-29T19:30", "ENCERRADA"),
            jogo("Botafogo", "Grêmio", null, null),
          ];
        }
        return [];
      },
    });

    assert.equal(fetched.includes(18), false);
    assert.deepEqual(
      fetched.filter((r) => r >= 18),
      [19, 20, 21]
    );
    assert.equal(extra.length, 2);
    assert.equal(extra.some((m) => m.matchday === 21 && m.home === "Botafogo FR"), false);
    assert.equal(
      extra.some((m) => m.matchday === 20 && m.home === "Grêmio FBPA"),
      true
    );
  });
});

describe("buildSeasonFromMatches with a postponed Grêmio round", () => {
  it("keeps official round numbers and omits the unplayed Grêmio match", () => {
    const matches: ParsedMatch[] = [
      {
        matchday: 20,
        dateIso: "2026-07-26",
        home: "Grêmio FBPA",
        away: "Fluminense FC",
        homeGoals: 1,
        awayGoals: 1,
      },
      {
        matchday: 21,
        dateIso: "2026-07-29",
        home: "Mirassol FC",
        away: "Clube do Remo",
        homeGoals: 2,
        awayGoals: 1,
      },
      {
        matchday: 22,
        dateIso: "2026-08-08",
        home: "Grêmio FBPA",
        away: "São Paulo FC",
        homeGoals: 2,
        awayGoals: 1,
      },
    ];
    const season = buildSeasonFromMatches(2026, matches);
    assert.deepEqual(
      season.rounds.map((r) => r.round),
      [20, 22]
    );
    assert.equal(season.summary.played, 2);
    assert.equal(season.rounds[0]!.accumulatedPoints, 1);
    assert.equal(season.rounds[1]!.accumulatedPoints, 4);
  });
});
