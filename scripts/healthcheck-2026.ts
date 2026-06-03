import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import api from "campeonato-brasileiro-api";
import {
  fetchSerieAText,
  parseOpenFootballSerieA,
} from "./lib/openfootballBrazil";
import { seasonDataSchema } from "../src/lib/types";

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data", "2026.json");

function isGremioName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return n.includes("gremio") || n.includes("grêmio");
}

function loadSeason() {
  if (!existsSync(DATA)) {
    console.error("healthcheck: data/2026.json not found");
    process.exit(1);
  }
  return seasonDataSchema.parse(JSON.parse(readFileSync(DATA, "utf8")));
}

async function countGeGremioFinishedRounds(): Promise<number> {
  const comp = await api.getCompetition("a", {});
  const rounds = new Set<number>();
  for (const m of comp.matches ?? []) {
    if (m.status !== "finished") continue;
    if (!m.score || m.score.home == null || m.score.away == null) continue;
    const round = m.round ?? 0;
    if (!round) continue;
    const home = m.homeTeam?.name ?? "";
    const away = m.awayTeam?.name ?? "";
    if (isGremioName(home) || isGremioName(away)) {
      rounds.add(round);
    }
  }
  return rounds.size;
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
    const geRounds = await countGeGremioFinishedRounds();
    if (geRounds > jsonRounds) {
      console.error(
        `healthcheck: stale data — JSON has ${jsonRounds} Grêmio rounds but GE has ${geRounds} finished`
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
