import { z } from "zod";

export const roundEntrySchema = z.object({
  round: z.number().int().positive(),
  date: z.string(),
  opponent: z.string(),
  homeAway: z.enum(["H", "A"]),
  scoreFor: z.number().int().min(0),
  scoreAgainst: z.number().int().min(0),
  result: z.enum(["W", "D", "L"]),
  pointsGained: z.union([z.literal(3), z.literal(1), z.literal(0)]),
  accumulatedPoints: z.number().int().min(0),
  tablePosition: z.number().int().positive(),
  /** Elo após a rodada (Brasileirão Série A, cálculo local). */
  elo: z.number().nullable().optional(),
});

export type RoundEntry = z.infer<typeof roundEntrySchema>;

export const seasonSummarySchema = z.object({
  played: z.number().int().min(0),
  wins: z.number().int().min(0),
  draws: z.number().int().min(0),
  losses: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  points: z.number().int().min(0),
  finalPosition: z.number().int().positive().nullable(),
  pointsPercentage: z.number().min(0).max(100),
  /** Média simples das rodadas com `elo` definido. */
  averageElo: z.number().nullable().optional(),
  /** Quantidade de rodadas com Elo preenchido. */
  eloCovered: z.number().int().min(0).optional(),
  /** Elo após a última rodada com dado. */
  finalElo: z.number().nullable().optional(),
});

export type SeasonSummary = z.infer<typeof seasonSummarySchema>;

export const seasonDataSchema = z.object({
  year: z.number().int(),
  team: z.literal("Grêmio"),
  updatedAt: z.string().optional(),
  source: z.string().optional(),
  rounds: z.array(roundEntrySchema),
  summary: seasonSummarySchema,
});

export type SeasonData = z.infer<typeof seasonDataSchema>;

export function parseSeasonData(data: unknown): SeasonData {
  return seasonDataSchema.parse(data);
}
