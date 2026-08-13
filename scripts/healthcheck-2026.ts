import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import api from "campeonato-brasileiro-api";
import {
  fetchSerieAText,
  parseOpenFootballSerieA,
} from "./lib/openfootballBrazil";
import {
  fetchGeRoundJogos,
  geJogoHasFinishedGremio,
} from "./lib/geRoundApi";
import { seasonDataSchema } from "../src/lib/types";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "2026.json");

function loadSeason() {
  if (!existsSync(DATA)) {
    console.error("healthcheck: data/2026.json not found");
    process.exit(1);
  }
  return seasonDataSchema.parse(JSON.parse(readFileSync(DATA, "utf8")));
}

async function missingFinishedGremioRounds(
  haveRounds: Set<number>
): Promise<number[]> {
  const comp = await api.getCompetition("a", {});
  const exposedRound = comp.rounds?.[0]?.number ?? 0;
  const src = comp.competition?.source as
    | { resourceId?: string | null; tUUID?: string | null }
    | undefined;
  const resourceId = src?.resourceId ?? src?.tUUID ?? null;
  const phaseSlug = comp.competition?.phase?.slug ?? null;
  if (!resourceId || !phaseSlug || exposedRound < 1) {
    throw new Error("GE competition metadata missing resourceId/phase");
  }

  const missing: number[] = [];
  const checks: Promise<void>[] = [];
  for (let round = 1; round <= exposedRound; round++) {
    if (haveRounds.has(round)) continue;
    checks.push(
      fetchGeRoundJogos(resourceId, phaseSlug, round).then((jogos) => {
        if (jogos.some(geJogoHasFinishedGremio)) {
          missing.push(round);
        }
      })
    );
  }
  await Promise.all(checks);
  return missing.sort((a, b) => a - b);
}

async function main() {
  const season = loadSeason();
  const jsonRounds = season.rounds.length;

  if (jsonRounds === 0) {
    console.error("healthcheck: data/2026.json has no rounds");
    process.exit(1);
  }

  try {
    const txt = await fetchSerieAText(2026);
    const parsed = parseOpenFootballSerieA(txt, 2026);
    if (parsed.length === 0) {
      console.error(
        "healthcheck: OpenFootball TXT fetched but parser returned 0 matches (format regression?)"
      );
      process.exit(1);
    }
  } catch (e) {
    console.warn("healthcheck: OpenFootball fetch skipped:", (e as Error).message);
  }

  try {
    const missing = await missingFinishedGremioRounds(
      new Set(season.rounds.map((r) => r.round))
    );
    if (missing.length > 0) {
      console.error(
        `healthcheck: stale data — JSON missing finished Grêmio rounds: ${missing.join(", ")}`
      );
      process.exit(1);
    }
  } catch (e) {
    console.warn("healthcheck: GE comparison skipped:", (e as Error).message);
  }

  const lastRound = season.rounds.at(-1)!;
  const lastGame = new Date(`${lastRound.date}T12:00:00Z`);
  const daysSinceGame =
    (Date.now() - lastGame.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceGame > 14) {
    console.warn(
      `healthcheck: last recorded game was ${Math.floor(daysSinceGame)} days ago (round ${lastRound.round}) — ok if off-season`
    );
  }

  console.log(
    `healthcheck: ok (${jsonRounds} rounds, last game ${lastRound.date}, ${season.summary.points} pts)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
