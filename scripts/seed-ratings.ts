import path from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { seasonDataSchema } from "../src/lib/types";
import type { SeasonData } from "../src/lib/types";
import { fillMissingRatingsForSeason } from "./lib/fillRatings";
import { finalizeSeasonWithRatings } from "./lib/ratingsMerge";
import { writeSeasonJson } from "./lib/openfootballBrazil";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const CACHE = path.join(ROOT, "cache", "ratings");
const DEFAULT_YEARS = [2020, 2021, 2023, 2024, 2025] as const;

function maxRoundsForSeed(): number | undefined {
  const raw = process.env.SEED_RATINGS_MAX_ROUNDS?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

function yearsToSeed(): number[] {
  const raw = process.env.SEED_RATINGS_YEARS?.trim();
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
    console.error("Nenhum ano em SEED_RATINGS_YEARS.");
    process.exit(1);
  }

  for (const year of years) {
    const dataPath = path.join(DATA, `${year}.json`);
    const raw = JSON.parse(readFileSync(dataPath, "utf8"));
    let data: SeasonData = seasonDataSchema.parse(raw);
    console.log(`\n${year}: buscando notas (SofaScore, depois FotMob)...`);
    const maxRound = maxRoundsForSeed();
    data = await fillMissingRatingsForSeason(
      data,
      maxRound != null ? { maxRound } : undefined
    );
    data = finalizeSeasonWithRatings(data);
    writeSeasonJson(dataPath, data);

    const cachePayload = Object.fromEntries(
      data.rounds.map((r) => [
        String(r.round),
        { rating: r.rating ?? null, source: r.ratingSource ?? null },
      ])
    );
    writeFileSync(
      path.join(CACHE, `${year}.json`),
      JSON.stringify(cachePayload, null, 2) + "\n",
      "utf8"
    );

    console.log(
      `  -> ratings ${data.summary.ratingsCovered ?? 0}/${data.summary.played} · média ${data.summary.averageRating ?? "—"}`
    );
  }
  console.log("\nConcluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
