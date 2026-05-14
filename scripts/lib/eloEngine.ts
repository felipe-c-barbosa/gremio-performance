/** Elo Rating (método Yuri Malheiros): K=20, inicial 1000, sem mando. */

export const ELO_INITIAL = 1000;
export const ELO_K = 20;

export function normalizeTeamKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export class EloEngine {
  private readonly ratings = new Map<string, number>();

  get(key: string): number {
    return this.ratings.get(key) ?? ELO_INITIAL;
  }

  private set(key: string, value: number): void {
    this.ratings.set(key, value);
  }

  /** Atualiza Elo dos dois times após o resultado (simétrico). */
  applyMatch(
    homeName: string,
    awayName: string,
    homeGoals: number,
    awayGoals: number
  ): void {
    const hk = normalizeTeamKey(homeName);
    const ak = normalizeTeamKey(awayName);
    const rh = this.get(hk);
    const ra = this.get(ak);
    const Eh = 1 / (1 + Math.pow(10, (ra - rh) / 400));
    const Ea = 1 - Eh;
    let Sh: number;
    let Sa: number;
    if (homeGoals > awayGoals) {
      Sh = 1;
      Sa = 0;
    } else if (homeGoals < awayGoals) {
      Sh = 0;
      Sa = 1;
    } else {
      Sh = 0.5;
      Sa = 0.5;
    }
    this.set(hk, rh + ELO_K * (Sh - Eh));
    this.set(ak, ra + ELO_K * (Sa - Ea));
  }
}
