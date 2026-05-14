import path from "node:path";
import {
  buildSeasonFromOpenFootball,
  writeSeasonJson,
} from "./lib/openfootballBrazil";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const YEARS = [2020, 2021, 2023, 2024, 2025] as const;

async function main() {
  for (const year of YEARS) {
    console.log(`Fetching and building ${year}...`);
    const data = await buildSeasonFromOpenFootball(year, {
      updatedAt: new Date().toISOString(),
    });
    writeSeasonJson(path.join(DATA, `${year}.json`), data);
    console.log(`  -> ${data.rounds.length} rounds, ${data.summary.points} pts`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
