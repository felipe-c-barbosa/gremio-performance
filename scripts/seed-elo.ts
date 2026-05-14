import path from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { seasonDataSchema } from "../src/lib/types";
import type { SeasonData } from "../src/lib/types";
import { fillEloForSeason } from "./lib/fillElo";
import { finalizeSeasonWithElo } from "./lib/eloMerge";
import { writeSeasonJson } from "./lib/openfootballBrazil";
import { buildGremioEloByRound } from "./lib/eloHistory";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const CACHE = path.join(ROOT, "cache", "elo");
const DEFAULT_YEARS = [2020, 2021, 2023, 2024, 2025] as const;

function yearsToSeed(): number[] {
  const raw = process.env.SEED_ELO_YEARS?.trim();
  if (!raw) return [...DEFAULT_YEARS];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

async function main() {
  mkdirSync(CACHE, { recursive: true });

  const years = yearsToSeed();
  if (years.length === 0) {
    console.error("Nenhum ano em SEED_ELO_YEARS.");
    process.exit(1);
  }

  const throughYear = Math.max(...years);
  console.log(`\nCalculando Elo (2018–${throughYear}, método Yuri Malheiros)...`);
  const eloMap = await buildGremioEloByRound(throughYear);

  const cachePayload: Record<string, Record<string, number | null>> = {};
  for (const year of years) {
    cachePayload[String(year)] = {};
    for (let r = 1; r <= 38; r++) {
      cachePayload[String(year)]![String(r)] =
        eloMap.get(`${year}:${r}`) ?? null;
    }
  }
  writeFileSync(
    path.join(CACHE, "seasons.json"),
    JSON.stringify(cachePayload, null, 2) + "\n",
    "utf8"
  );

  for (const year of years) {
    const dataPath = path.join(DATA, `${year}.json`);
    const raw = JSON.parse(readFileSync(dataPath, "utf8"));
    let data: SeasonData = seasonDataSchema.parse(raw);
    console.log(`\n${year}: aplicando Elo...`);
    data = fillEloForSeason(data, eloMap);
    data = finalizeSeasonWithElo(data);
    writeSeasonJson(dataPath, data);

    console.log(
      `  -> elo ${data.summary.eloCovered ?? 0}/${data.summary.played} · média ${data.summary.averageElo ?? "—"} · final ${data.summary.finalElo ?? "—"}`
    );
  }
  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
