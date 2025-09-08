import { z } from "zod";

const kvNum = z.tuple([z.union([z.number(), z.string()]), z.union([z.number(), z.null()])]);
const series1D = z.array(kvNum);

// Define a reusable schema for data that can appear under different cadences
const cadenceDataSchema = z.object({
  tempAnomaly: series1D.optional(),
  precipTotal: series1D.optional(),
  degreeDays: z.object({
    hdd: series1D.optional(),
    cdd: series1D.optional(),
  }).optional(),
  extremes: z.object({
    hotDays90F: series1D.optional(),
    warmNights70F: series1D.optional(),
    coldDays32F: series1D.optional(),
    max1DayPrecip: series1D.optional(),
    max5DayPrecip: series1D.optional(),
  }).optional(),
  // State/National specific fields
  emissions: z.object({
    co2: series1D.optional(),
  }).optional(),
  wildfire: z.object({
    acresBurned: series1D.optional(),
    fires: series1D.optional(),
  }).optional(),
  disasters: z.record(series1D).optional(),
  population: series1D.optional(),
  femaCosts: z.any().optional(),
  economy: z.object({
    construction: series1D.optional(),
    agriculture: series1D.optional(),
    energy: series1D.optional(),
  }).optional(),
});

const seriesSchema = z.object({
  monthly: cadenceDataSchema.partial().optional(),
  annual: cadenceDataSchema.partial().optional(),
  fiscal: cadenceDataSchema.partial().optional(),
});

export const climateSchema = z.object({
  meta: z.object({
    version: z.number(),
    updated: z.string(),
    basePeriod: z.string(),
    units: z.record(z.string()),
  }),
  cities: z.record(
    z.object({
      series: seriesSchema,
      metadata: z.object({
        sources: z.array(z.string()).optional(),
        stations: z.array(z.string()).optional(),
        cityFips: z.string().optional(),
        stateFips: z.string().optional(),
        stateId: z.string().optional(),
      }).partial(),
    })
  ),
  states: z.record(
    z.object({
      series: seriesSchema,
      metadata: z.object({
        sources: z.array(z.string()).optional(),
        stateFips: z.string().optional(),
      }).partial(),
    })
  ).optional(),
  national: z.object({
    series: seriesSchema,
    metadata: z.object({
      sources: z.array(z.string()).optional(),
    }).partial(),
  }).optional(),
  global: z.object({
    series: seriesSchema,
    metadata: z.object({
      sources: z.array(z.string()).optional(),
    }).partial(),
  }).optional(),
  scenarios: z.array(z.any()).optional(),
});

export type ClimateArtifact = z.infer<typeof climateSchema>;