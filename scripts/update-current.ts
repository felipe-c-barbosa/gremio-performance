import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import * as cheerio from "cheerio";
import api from "campeonato-brasileiro-api";
import {
  writeSeasonJson,
  parseOpenFootballSerieA,
  buildSeasonFromMatches,
  fetchSerieAText,
  OPENFOOTBALL_SERIE_A_BASE,
} from "./lib/openfootballBrazil";
import { buildGremioEloByRound } from "./lib/eloHistory";
import { fillEloForSeason } from "./lib/fillElo";
import { finalizeSeasonWithElo } from "./lib/eloMerge";
import { mergeGeRoundsIntoSeason } from "./lib/seasonMerge";
import type { RoundEntry, SeasonData } from "../src/lib/types";
import { seasonDataSchema } from "../src/lib/types";

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "2026.json");

function isGremioName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return n.includes("gremio") || n.includes("grêmio");
}

function loadExisting(): SeasonData | null {
  if (!existsSync(OUT)) return null;
  try {
    const raw = JSON.parse(readFileSync(OUT, "utf8"));
    return seasonDataSchema.parse(raw);
  } catch {
    return null;
  }
}

/** Merge finished Grêmio matches from GE (current payload) into existing season. */
async function buildFromGloboMerge(
  existing: SeasonData | null,
  options?: { html?: string }
): Promise<SeasonData> {
  const comp = await api.getCompetition("a", options?.html ? { html: options.html } : {});
  const matches = comp.matches ?? [];
  const tables = comp.tables?.[0]?.entries ?? [];
  const gremioStanding = tables.find((e) => isGremioName(e.team?.name));
  const tablePos = gremioStanding?.position ?? 10;

  const byRound = new Map<number, RoundEntry>();
  if (existing) {
    for (const r of existing.rounds) {
      byRound.set(r.round, r);
    }
  }

  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (!m.score || m.score.home == null || m.score.away == null) continue;
    const round = m.round ?? 0;
    if (!round) continue;

    const home = m.homeTeam?.name ?? "";
    const away = m.awayTeam?.name ?? "";
    const gHome = isGremioName(home);
    const gAway = isGremioName(away);
    if (!gHome && !gAway) continue;

    const scoreFor = gHome ? m.score.home : m.score.away;
    const scoreAgainst = gHome ? m.score.away : m.score.home;
    let result: "W" | "D" | "L";
    let pointsGained: 0 | 1 | 3;
    if (scoreFor > scoreAgainst) {
      result = "W";
      pointsGained = 3;
    } else if (scoreFor === scoreAgainst) {
      result = "D";
      pointsGained = 1;
    } else {
      result = "L";
      pointsGained = 0;
    }

    const kept = byRound.get(round);
    const entry: RoundEntry = {
      round,
      date: m.date ?? new Date().toISOString().slice(0, 10),
      opponent: gHome ? away : home,
      homeAway: gHome ? "H" : "A",
      scoreFor,
      scoreAgainst,
      result,
      pointsGained,
      accumulatedPoints: 0,
      tablePosition: tablePos,
    };
    if (kept && typeof kept.elo === "number") {
      entry.elo = kept.elo;
    }
    if (kept && typeof kept.leagueAveragePoints === "number") {
      entry.leagueAveragePoints = kept.leagueAveragePoints;
    }
    byRound.set(round, entry);
  }

  const sortedRounds = [...byRound.keys()].sort((a, b) => a - b);
  let acc = 0;
  const rounds: RoundEntry[] = sortedRounds.map((rn) => {
    const r = byRound.get(rn)!;
    acc += r.pointsGained;
    return { ...r, accumulatedPoints: acc };
  });

  const played = rounds.length;
  const wins = rounds.filter((r) => r.result === "W").length;
  const draws = rounds.filter((r) => r.result === "D").length;
  const losses = rounds.filter((r) => r.result === "L").length;
  const goalsFor = rounds.reduce((s, r) => s + r.scoreFor, 0);
  const goalsAgainst = rounds.reduce((s, r) => s + r.scoreAgainst, 0);
  const points = rounds.at(-1)?.accumulatedPoints ?? 0;
  const maxPts = played * 3;
  const pointsPercentage =
    maxPts > 0 ? Math.round((points / maxPts) * 1000) / 10 : 0;

  return finalizeSeasonWithElo(
    seasonDataSchema.parse({
      year: 2026,
      team: "Grêmio",
      updatedAt: new Date().toISOString(),
      source: "ge.globo.com (campeonato-brasileiro-api merge)",
      rounds,
      summary: {
        played,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        points,
        finalPosition: null,
        pointsPercentage,
      },
    })
  );
}

async function tryFetchGeSeason(
  existing: SeasonData | null
): Promise<SeasonData | null> {
  try {
    return await buildFromGloboMerge(existing);
  } catch (e) {
    console.warn("GE API preview failed:", (e as Error).message);
    return null;
  }
}

async function persist2026(data: SeasonData, label: string) {
  const eloMap = await buildGremioEloByRound(2026);
  const filled = fillEloForSeason(data, eloMap);
  const out = finalizeSeasonWithElo(filled);
  writeSeasonJson(OUT, out);
  console.log(
    `${label} -> ${OUT} (${out.rounds.length} rounds, elo ${out.summary.eloCovered ?? 0}/${out.summary.played}).`
  );
}

async function main() {
  const updatedAt = new Date().toISOString();
  const prev = loadExisting();
  const gePreview = await tryFetchGeSeason(prev);

  try {
    const txt = await fetchSerieAText(2026);
    const matches = parseOpenFootballSerieA(txt, 2026);
    if (matches.length > 0) {
      let data = buildSeasonFromMatches(2026, matches, {
        updatedAt,
        source: `${OPENFOOTBALL_SERIE_A_BASE}/2026_br1.txt`,
        previousSeason: prev,
      });
      if (gePreview && gePreview.rounds.length > data.rounds.length) {
        data = mergeGeRoundsIntoSeason(data, gePreview);
        await persist2026(data, "OpenFootball + GE merge");
      } else {
        await persist2026(data, "OpenFootball");
      }
      return;
    }
    console.warn(
      "OpenFootball 2026: TXT fetched but parsed 0 matches (check format changes)."
    );
  } catch (e) {
    console.warn("OpenFootball 2026 unavailable:", (e as Error).message);
  }

  try {
    const data = gePreview ?? (await buildFromGloboMerge(prev));
    await persist2026(data, "GE API merge");
    return;
  } catch (e) {
    console.warn("GE API merge failed:", (e as Error).message);
  }

  try {
    const url = "https://ge.globo.com/futebol/brasileirao-serie-a/";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GE fetch ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    if (!$("#scriptReact").length) {
      throw new Error("GE page missing #scriptReact");
    }
    const data = await buildFromGloboMerge(prev, { html });
    data.source = "ge.globo.com (cheerio check + campeonato-brasileiro-api)";
    await persist2026(data, "GE fetch");
  } catch (e) {
    console.error("All update strategies failed:", e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
