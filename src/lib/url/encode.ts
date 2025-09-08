import { ClimateState as ClimateUrlState } from '@/hooks/useClimateState';
import LZString from 'lz-string';

export function encodeClimateState(state: ClimateUrlState): string {
  const obj = {
    c: state.city,
    s: state.state,
    b: state.basePeriod,
    d: state.cadence,
    t: state.disasterTypes,
    p: state.perCapita ? 1 : 0,
    dd: state.degreeDayMode,
    cs: state.co2Smoothing ? 1 : 0,
    ndd: state.normalizeDegreeDays ? 1 : 0,
    wf: state.wildfireScope,
    wn: state.warmNightThreshold,
    cm: state.co2Mode,
    as: state.anomalySource,
    asmooth: state.anomalySmoothing ? 1 : 0,
    sc: state.selectedCities,
    sy: state.syncY ? 1 : 0,
    yr: state.yearRange,
    ht: state.hotDayThreshold,
    cost: state.costMode,
    inf: state.inflationAdjust ? 1 : 0,
    // New fields for Story 5
    hem: state.heatEconMetric,
    hef: state.heatEconFit,
    hes: state.heatEconScope,
  };
  const json = JSON.stringify(obj);
  return LZString.compressToEncodedURIComponent(json);
}