import { ClimateState as ClimateUrlState } from '@/hooks/useClimateState';
import { climateStateSchema } from './params';
import LZString from 'lz-string';

export function decodeClimateState(encoded: string): Partial<ClimateUrlState> {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return {};
    const raw = JSON.parse(json);
    
    const parsed = climateStateSchema.partial().parse({
      city: raw.c,
      state: raw.s,
      basePeriod: raw.b,
      cadence: raw.d,
      disasterTypes: raw.t,
      perCapita: raw.p === 1,
      degreeDayMode: raw.dd,
      co2Smoothing: raw.cs === 1,
      normalizeDegreeDays: raw.ndd === 1,
      wildfireScope: raw.wf,
      warmNightThreshold: raw.wn,
      co2Mode: raw.cm,
      anomalySource: raw.as,
      anomalySmoothing: raw.asmooth === 1,
      selectedCities: raw.sc,
      syncY: raw.sy === 1,
      yearRange: raw.yr,
      hotDayThreshold: raw.ht,
      costMode: raw.cost,
      inflationAdjust: raw.inf === 1,
      // New fields for Story 5
      heatEconMetric: raw.hem,
      heatEconFit: raw.hef,
      heatEconScope: raw.hes,
    });
    return parsed;
  } catch (e) {
    console.error("Failed to decode climate state from URL", e);
    return {};
  }
}