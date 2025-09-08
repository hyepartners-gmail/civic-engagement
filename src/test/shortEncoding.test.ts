import { encodeClimateStateShort, decodeClimateStateShort } from '@/lib/url/encodeShort';
import { ClimateState } from '@/hooks/useClimateState';

describe('Short Climate State Encoding', () => {
  const defaultState: ClimateState = {
    city: 'seattle',
    stateId: 'wa',
    basePeriod: '1991-2020',
    cadence: 'annual',
    disasterTypes: ['flood', 'hurricane', 'wildfire', 'severe-storm'],
    perCapita: false,
    degreeDayMode: 'both',
    co2Smoothing: false,
    normalizeDegreeDays: false,
    wildfireScope: 'national',
    warmNightThreshold: 70,
    co2Mode: 'per-capita',
    anomalySource: 'global',
    anomalySmoothing: false,
    selectedCities: ['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york'],
    syncY: true,
    yearRange: [1950, 2023],
    hotDayThreshold: 90,
    costMode: 'total',
    inflationAdjust: true,
    heatEconMetric: 'construction',
    heatEconFit: 'linear',
    heatEconScope: 'state',
  };

  test('encodes default state as empty string', () => {
    const encoded = encodeClimateStateShort(defaultState);
    expect(encoded).toBe('');
  });

  test('encodes non-default city', () => {
    const state = { ...defaultState, city: 'los-angeles' };
    const encoded = encodeClimateStateShort(state);
    expect(encoded).toBe('cLAX');
  });

  test('encodes multiple non-default values', () => {
    const state = { 
      ...defaultState, 
      city: 'chicago',
      perCapita: true,
      cadence: 'fiscal'
    };
    const encoded = encodeClimateStateShort(state);
    expect(encoded).toBe('cCHI_dF_p1');
  });

  test('decodes empty string to default values', () => {
    const decoded = decodeClimateStateShort('');
    expect(decoded).toEqual({});
  });

  test('decodes city abbreviation', () => {
    const decoded = decodeClimateStateShort('cLAX');
    expect(decoded).toEqual({ city: 'los-angeles' });
  });

  test('decodes multiple values', () => {
    const decoded = decodeClimateStateShort('cCHI_dF_p1');
    expect(decoded).toEqual({ 
      city: 'chicago',
      cadence: 'fiscal',
      perCapita: true
    });
  });

  test('round-trip encoding/decoding preserves data', () => {
    const state = { 
      ...defaultState, 
      city: 'new-york',
      perCapita: true,
      cadence: 'fiscal',
      warmNightThreshold: 80
    };
    const encoded = encodeClimateStateShort(state);
    const decoded = decodeClimateStateShort(encoded);
    
    // Apply decoded values to default state
    const finalState = { ...defaultState, ...decoded };
    
    // Check specific values
    expect(finalState.city).toBe('new-york');
    expect(finalState.cadence).toBe('fiscal');
    expect(finalState.perCapita).toBe(true);
    expect(finalState.warmNightThreshold).toBe(80);
  });
});