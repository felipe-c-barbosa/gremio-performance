import path from "node:path";
import {
  buildSeasonFromOpenFootball,
  writeSeasonJson,
} from "./lib/openfootballBrazil";
import { buildGremioEloByRound } from "./lib/eloHistory";
import { fillEloForSeason } from "./lib/fillElo";
import { finalizeSeasonWithElo } from "./lib/eloMerge";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const YEARS = [2020, 2021, 2023, 2024, 2025] as const;

async function main() {
  const throughYear = Math.max(...YEARS);
  console.log(`Pré-calculando Elo (2018–${throughYear})...`);
  const eloMap = await buildGremioEloByRound(throughYear);

  for (const year of YEARS) {
    console.log(`Fetching and building ${year}...`);
    let data = await buildSeasonFromOpenFootball(year, {
      updatedAt: new Date().toISOString(),
    });
    data = fillEloForSeason(data, eloMap);
    data = finalizeSeasonWithElo(data);
    writeSeasonJson(path.join(DATA, `${year}.json`), data);
    console.log(
      `  -> ${data.rounds.length} rounds, ${data.summary.points} pts, elo ${data.summary.eloCovered ?? 0}/${data.summary.played}`
    );
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
