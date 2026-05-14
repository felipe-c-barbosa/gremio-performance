import { HeaderHero } from "@/components/HeaderHero";
import { SeasonSummaryCards } from "@/components/SeasonSummaryCards";
import { DashboardCharts } from "@/components/charts/DashboardCharts";
import { parseSeasonData } from "@/lib/types";
import type { SeasonData } from "@/lib/types";
import { COMPARISON_YEARS } from "@/lib/data";

import raw2020 from "../../data/2020.json";
import raw2021 from "../../data/2021.json";
import raw2023 from "../../data/2023.json";
import raw2024 from "../../data/2024.json";
import raw2025 from "../../data/2025.json";
import raw2026 from "../../data/2026.json";

function loadSeasons(): SeasonData[] {
  const raw = [raw2020, raw2021, raw2023, raw2024, raw2025, raw2026];
  return raw.map((r) => parseSeasonData(r));
}

export default function Home() {
  const seasons = loadSeasons();
  const byYear = new Map(seasons.map((s) => [s.year, s]));

  for (const y of COMPARISON_YEARS) {
    if (!byYear.has(y)) {
      throw new Error(`Missing season data for ${y}`);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <HeaderHero seasons={seasons} />
      <div className="mt-12 space-y-12">
        <SeasonSummaryCards byYear={byYear} />
        <DashboardCharts seasons={seasons} />
      </div>
    </div>
  );
}
