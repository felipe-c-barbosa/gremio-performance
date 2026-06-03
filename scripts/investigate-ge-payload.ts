import api from "campeonato-brasileiro-api";

function isGremio(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return n.includes("gremio") || n.includes("grêmio");
}

function summarizeMatch(m: {
  round: number | null;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: { home: number | null; away: number | null };
  status: string;
  statusCode: string | null;
  started: boolean;
  date: string | null;
  time: string | null;
}) {
  return {
    round: m.round,
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
    score: m.score,
    status: m.status,
    statusCode: m.statusCode,
    started: m.started,
    date: m.date,
    time: m.time,
  };
}

async function main() {
const comp = await api.getCompetition("a", {});

console.log("=== COMPETITION META ===");
console.log("Season:", comp.competition?.season);
console.log(
  "Rodada exposta no payload:",
  comp.rounds?.[0]?.number,
  "de",
  comp.rounds?.[0]?.total
);
console.log("Jogos em comp.matches (só rodada atual):", comp.matches?.length);

const gremioInPayload = (comp.matches ?? []).filter(
  (m) => isGremio(m.homeTeam?.name) || isGremio(m.awayTeam?.name)
);
console.log("Jogos do Grêmio na rodada atual:", gremioInPayload.length);

console.log("\n=== JOGOS DO GRÊMIO NA RODADA ATUAL ===");
for (const m of gremioInPayload) {
  console.log(JSON.stringify(summarizeMatch(m), null, 2));
}

console.log("\n=== JOGOS COM CORINTHIANS NA RODADA ATUAL ===");
for (const m of comp.matches ?? []) {
  const names = `${m.homeTeam?.name} ${m.awayTeam?.name}`.toLowerCase();
  if (names.includes("corinthians") || names.includes("corintiano")) {
    console.log(JSON.stringify(summarizeMatch(m), null, 2));
  }
}

console.log("\n=== TODOS OS JOGOS DA RODADA ATUAL (resumo) ===");
for (const m of comp.matches ?? []) {
  console.log(
    `R${m.round} ${m.status}/${m.statusCode} ${m.homeTeam?.name} ${m.score.home ?? "?"}-${m.score.away ?? "?"} ${m.awayTeam?.name}`
  );
}

for (const n of [17, 18, 19]) {
  console.log(`\n=== getRounds({ number: ${n} }) ===`);
  try {
    const result = await api.getRounds("a", { number: n });
    const matches = result.rounds?.[0]?.matches ?? [];
    console.log(`OK — ${matches.length} jogos`);
    for (const m of matches) {
      if (isGremio(m.homeTeam?.name) || isGremio(m.awayTeam?.name)) {
        console.log("  Grêmio:", JSON.stringify(summarizeMatch(m)));
      }
    }
  } catch (e) {
    const err = e as { code?: string; message?: string; details?: unknown };
    console.log("ERRO:", err.code, err.message);
    if (err.details) console.log("  details:", err.details);
  }
}
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
