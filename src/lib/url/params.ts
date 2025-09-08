import { z } from 'zod';
import { safeCoerceBoolean, safeCoerceNumber } from '../schema';

export const climateParam = 'c';

// Define the specific disaster types to match the application's type definition
const disasterTypeEnum = z.enum(['flood', 'drought', 'wildfire', 'winter-storm', 'severe-storm', 'hurricane']);

export const climateStateSchema = z.object({
  city: z.string().optional().default('seattle'),
  stateId: z.string().optional().default('wa'),
  basePeriod: z.enum(['1991-2020', '1951-1980', '20th-century']).optional().default('1991-2020'),
  cadence: z.enum(['annual', 'fiscal']).optional().default('annual'),
  // Use the specific enum for disaster types
  disasterTypes: z.array(disasterTypeEnum).optional().default(['flood', 'hurricane', 'wildfire', 'severe-storm']),
  perCapita: safeCoerceBoolean.optional().default(false),
  degreeDayMode: z.enum(['hdd', 'cdd', 'both']).optional().default('both'),
  co2Smoothing: safeCoerceBoolean.optional().default(false),
  normalizeDegreeDays: safeCoerceBoolean.optional().default(false),
  wildfireScope: z.enum(['state', 'national']).optional().default('national'),
  warmNightThreshold: safeCoerceNumber.optional().default(70),
  co2Mode: z.enum(['per-capita', 'total']).optional().default('per-capita'),
  anomalySource: z.enum(['global', 'national']).optional().default('global'),
  anomalySmoothing: safeCoerceBoolean.optional().default(false),
  selectedCities: z.array(z.string()).optional().default(['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york']),
  syncY: safeCoerceBoolean.optional().default(true),
  yearRange: z.tuple([z.number(), z.number()]).optional().default([1950, 2023]),
  hotDayThreshold: safeCoerceNumber.optional().default(90),
  costMode: z.enum(['total', 'per-capita']).optional().default('total'),
  inflationAdjust: safeCoerceBoolean.optional().default(true),
  heatEconMetric: z.enum(['construction', 'agriculture', 'energy']).optional().default('construction'),
  heatEconFit: z.enum(['linear', 'none']).optional().default('linear'),
  heatEconScope: z.enum(['city', 'state']).optional().default('state'),
});