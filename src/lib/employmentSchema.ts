import { z } from 'zod';

export const employmentArtifactSchema = z.object({
  index: z.array(z.object({
    date: z.string(),
    fy: z.number(),
    fyMonth: z.number(),
    period_type: z.enum(['month', 'fiscal_year'])
  })),
  series: z.record(z.array(z.number().nullable())),
  units: z.record(z.string()),
  meta: z.object({
    notes: z.array(z.string()),
    created_at: z.string(),
    version: z.string()
  })
});

export const recessionSchema = z.array(z.object({
  start: z.string(),
  end: z.string(),
}));

export const gdpSchema = z.array(z.object({
  year: z.number(),
  gdp_growth_pct: z.number(),
}));