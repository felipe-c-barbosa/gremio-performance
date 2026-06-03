import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeGeRoundsIntoSeason, summaryFromRounds } from "./seasonMerge";
import type { RoundEntry, SeasonData } from "../../src/lib/types";

function round(n: number, pts: 0 | 1 | 3): RoundEntry {
  return {
    round: n,
    date: `2026-05-${String(n).padStart(2, "0")}`,
    opponent: "Test FC",
    homeAway: "H",
    scoreFor: pts === 3 ? 2 : pts === 1 ? 1 : 0,
    scoreAgainst: pts === 0 ? 1 : 0,
    result: pts === 3 ? "W" : pts === 1 ? "D" : "L",
    pointsGained: pts,
    accumulatedPoints: 0,
    tablePosition: 10,
    leagueAveragePoints: 15,
  };
}

function season(rounds: RoundEntry[]): SeasonData {
  let acc = 0;
  const withAcc = rounds.map((r) => {
    acc += r.pointsGained;
    return { ...r, accumulatedPoints: acc };
  });
  return {
    year: 2026,
    team: "Grêmio",
    source: "test",
    rounds: withAcc,
    summary: { ...summaryFromRounds(withAcc), averageElo: null, eloCovered: 0, finalElo: null },
  };
}

describe("mergeGeRoundsIntoSeason", () => {
  it("returns primary when GE is not ahead", () => {
    const primary = season([round(1, 3), round(2, 1)]);
    const ge = season([round(1, 3)]);
    const merged = mergeGeRoundsIntoSeason(primary, ge);
    assert.equal(merged.rounds.length, 2);
    assert.equal(merged.source, "test");
  });

  it("adds missing rounds from GE and recalculates summary", () => {
    const primary = season([round(1, 3), round(2, 1)]);
    const ge = season([round(1, 3), round(2, 1), round(3, 3)]);
    const merged = mergeGeRoundsIntoSeason(primary, ge);
    assert.equal(merged.rounds.length, 3);
    assert.equal(merged.rounds[2]!.round, 3);
    assert.equal(merged.rounds[2]!.accumulatedPoints, 7);
    assert.equal(merged.summary.played, 3);
    assert.equal(merged.summary.points, 7);
    assert.match(merged.source!, /ge\.globo\.com \(rodadas extras\)/);
  });
});
