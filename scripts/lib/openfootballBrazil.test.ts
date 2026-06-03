import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parseOpenFootballSerieA,
  buildSeasonFromMatches,
  isGremio,
} from "./openfootballBrazil";

const FIXTURES = path.join(__dirname, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES, name), "utf8");
}

describe("parseOpenFootballSerieA", () => {
  it("parses legacy format (» Matchday, Jan/28, 19.30)", () => {
    const matches = parseOpenFootballSerieA(loadFixture("openfootball-legacy.txt"), 2026);
    assert.equal(matches.length, 2);

    const gremio = matches.filter((m) => isGremio(m.home) || isGremio(m.away));
    assert.equal(gremio.length, 2);
    assert.equal(gremio[0]!.matchday, 1);
    assert.equal(gremio[0]!.homeGoals, 2);
    assert.equal(gremio[0]!.awayGoals, 1);
    assert.equal(gremio[1]!.matchday, 2);
    assert.equal(gremio[1]!.homeGoals, 5);
    assert.equal(gremio[1]!.awayGoals, 3);
  });

  it("parses new format (▪ Matchday, Jan 28, 19:30)", () => {
    const matches = parseOpenFootballSerieA(loadFixture("openfootball-new.txt"), 2026);
    assert.equal(matches.length, 2);

    const gremio = matches.filter((m) => isGremio(m.home) || isGremio(m.away));
    assert.equal(gremio.length, 2);
    assert.equal(gremio[0]!.dateIso, "2026-01-28");
    assert.equal(gremio[1]!.dateIso, "2026-02-04");
  });

  it("builds Grêmio season rounds from parsed matches", () => {
    const matches = parseOpenFootballSerieA(loadFixture("openfootball-new.txt"), 2026);
    const season = buildSeasonFromMatches(2026, matches);
    assert.equal(season.rounds.length, 2);
    assert.equal(season.rounds[0]!.result, "L");
    assert.equal(season.rounds[1]!.result, "W");
    assert.equal(season.rounds[1]!.accumulatedPoints, 3);
  });
});
