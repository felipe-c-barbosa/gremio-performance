import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectSupplementalEloMatches,
  fillLeagueAverageFromGeTable,
  inferTableAfterMatchday,
  leagueAverageFromTable,
  mapTeamToOpenFootballName,
  roundEntryToParsedMatch,
} from "./geEnrichment";
import type { RoundEntry, SeasonData } from "../../src/lib/types";

const OF_NAMES = [
  "Mirassol FC",
  "Grêmio FBPA",
  "CA Paranaense",
  "SE Palmeiras",
  "CA Mineiro",
] as const;

function entry(partial: Partial<RoundEntry> & Pick<RoundEntry, "round">): RoundEntry {
  return {
    date: "2026-07-17",
    opponent: "Mirassol",
    homeAway: "A",
    scoreFor: 1,
    scoreAgainst: 2,
    result: "L",
    pointsGained: 0,
    accumulatedPoints: 21,
    tablePosition: 16,
    ...partial,
  };
}

describe("mapTeamToOpenFootballName", () => {
  it("maps short GE names to OpenFootball names", () => {
    assert.equal(mapTeamToOpenFootballName("Mirassol", OF_NAMES), "Mirassol FC");
    assert.equal(mapTeamToOpenFootballName("Grêmio", OF_NAMES), "Grêmio FBPA");
    assert.equal(
      mapTeamToOpenFootballName("Athletico-PR", OF_NAMES),
      "CA Paranaense"
    );
  });
});

describe("roundEntryToParsedMatch", () => {
  it("builds an away match with OF team names", () => {
    const m = roundEntryToParsedMatch(entry({ round: 19 }), OF_NAMES);
    assert.deepEqual(m, {
      matchday: 19,
      dateIso: "2026-07-17",
      home: "Mirassol FC",
      away: "Grêmio FBPA",
      homeGoals: 2,
      awayGoals: 1,
    });
  });
});

describe("inferTableAfterMatchday", () => {
  it("returns previous round when exposed round has not started", () => {
    assert.equal(
      inferTableAfterMatchday(20, [
        { status: "scheduled", scoreHome: null, scoreAway: null },
      ]),
      19
    );
  });

  it("returns exposed round when all matches finished", () => {
    assert.equal(
      inferTableAfterMatchday(19, [
        { status: "finished", scoreHome: 2, scoreAway: 1 },
        { status: "finished", scoreHome: 0, scoreAway: 0 },
      ]),
      19
    );
  });

  it("returns null mid-round", () => {
    assert.equal(
      inferTableAfterMatchday(19, [
        { status: "finished", scoreHome: 2, scoreAway: 1 },
        { status: "scheduled", scoreHome: null, scoreAway: null },
      ]),
      null
    );
  });
});

describe("leagueAverageFromTable", () => {
  it("averages points of non-Grêmio clubs", () => {
    const avg = leagueAverageFromTable([
      { name: "Palmeiras", points: 44 },
      { name: "Grêmio", points: 21 },
      { name: "Flamengo", points: 37 },
    ]);
    assert.equal(avg, 40.5);
  });
});

describe("fillLeagueAverageFromGeTable", () => {
  it("fills missing leagueAveragePoints on the inferred round", () => {
    const season: SeasonData = {
      year: 2026,
      team: "Grêmio",
      rounds: [
        entry({ round: 18, leagueAveragePoints: 24.37 }),
        entry({ round: 19 }),
      ],
      summary: {
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 21,
        finalPosition: null,
        pointsPercentage: 0,
      },
    };

    const filled = fillLeagueAverageFromGeTable(season, {
      tableEntries: [
        { name: "Palmeiras", points: 44 },
        { name: "Grêmio", points: 21 },
        { name: "Chapecoense", points: 9 },
      ],
      exposedRound: 20,
      exposedMatches: [
        { status: "scheduled", scoreHome: null, scoreAway: null },
      ],
    });

    assert.equal(filled.rounds[0]!.leagueAveragePoints, 24.37);
    assert.equal(filled.rounds[1]!.leagueAveragePoints, 26.5);
  });
});

describe("collectSupplementalEloMatches", () => {
  it("returns only GE-ahead rounds without elo", () => {
    const season: SeasonData = {
      year: 2026,
      team: "Grêmio",
      rounds: [
        entry({ round: 18, elo: 1005.49 }),
        entry({ round: 19 }),
      ],
      summary: {
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 21,
        finalPosition: null,
        pointsPercentage: 0,
      },
    };
    const ofDays = new Set([18]);
    const supp = collectSupplementalEloMatches(season, ofDays, OF_NAMES);
    assert.equal(supp.length, 1);
    assert.equal(supp[0]!.matchday, 19);
    assert.equal(supp[0]!.home, "Mirassol FC");
  });
});
