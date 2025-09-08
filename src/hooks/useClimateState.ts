"use client";

import { create } from 'zustand';
import { useUrlState } from './useUrlState';
import { useEffect, useRef } from 'react';

export type BasePeriod = '1951-1980' | '1981-2010' | '1991-2020' | '1901-2000' | '20th-century';
export type Cadence = 'annual' | 'fiscal' | 'monthly';
export type DisasterType = 'flood' | 'drought' | 'wildfire' | 'winter-storm' | 'severe-storm' | 'hurricane';
export type HeatEconMetric = 'construction' | 'agriculture' | 'energy';
export type HeatEconScope = 'city' | 'state';
export type DegreeDayMode = 'hdd' | 'cdd' | 'both';
export type WildfireScope = 'state' | 'national';
export type HeatEconFit = 'linear' | 'none';

export interface ClimateState {
  year: number | null;
  city: string;
  state: string;
  basePeriod: BasePeriod;
  cadence: Cadence;
  tempAnomalySmoothing: boolean;
  precipSmoothing: boolean;
  heatIndexThreshold: number;
  coldDaysThreshold: number;
  warmNightThreshold: number;
  anomalySmoothing: boolean;
  disasterTypes: DisasterType[];
  perCapita: boolean;
  anomalySource: 'national' | 'global' | 'city';
  co2Mode: 'total' | 'per-capita';
  costMode: 'total' | 'per-capita';
  inflationAdjust: boolean;
  // New properties from schema
  degreeDayMode: DegreeDayMode;
  co2Smoothing: boolean;
  normalizeDegreeDays: boolean;
  wildfireScope: WildfireScope;
  hotDayThreshold: number;
  selectedCities: string[];
  syncY: boolean;
  yearRange: [number, number];
  heatEconMetric: HeatEconMetric;
  heatEconFit: HeatEconFit;
  heatEconScope: HeatEconScope;
  setState: (partial: Partial<ClimateState>) => void;
  setYear: (year: number | null) => void;
  setCity: (city: string) => void;
  setState2: (state: string) => void;
}

// Create the store
const useClimateStore = create<ClimateState>((set) => ({
  year: null,
  city: 'seattle',
  state: 'wa',
  basePeriod: '1991-2020',
  cadence: 'annual',
  tempAnomalySmoothing: false,
  precipSmoothing: false,
  heatIndexThreshold: 90,
  coldDaysThreshold: 32,
  warmNightThreshold: 70,
  anomalySmoothing: false,
  disasterTypes: ['flood', 'drought', 'wildfire', 'winter-storm', 'severe-storm', 'hurricane'],
  perCapita: false,
  anomalySource: 'national',
  co2Mode: 'total',
  costMode: 'total',
  inflationAdjust: true,
  // New properties from schema
  degreeDayMode: 'both',
  co2Smoothing: false,
  normalizeDegreeDays: false,
  wildfireScope: 'national',
  hotDayThreshold: 90,
  selectedCities: ['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york'],
  syncY: true,
  yearRange: [1950, 2023],
  heatEconMetric: 'construction',
  heatEconFit: 'linear',
  heatEconScope: 'state',
  setState: (partial) => set(partial),
  setYear: (year) => set({ year }),
  setCity: (city) => set({ city }),
  setState2: (state) => set({ state }),
}));

// Export the hook with URL synchronization
export function useClimateState() {
  const state = useClimateStore();
  const isUpdating = useRef(false);
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Get URL state values
  const [urlCity, setUrlCity] = useUrlState<string>('city', 'seattle');
  const [urlState, setUrlState] = useUrlState<string | null>('state', null);
  
  // Sync URL state to store, but prevent updating during our own updates
  useEffect(() => {
    if (isUpdating.current) {
      return;
    }
    
    if (urlCity !== state.city) {
      state.setCity(urlCity);
    }
    
    if (urlState && urlState !== state.state) {
      state.setState({ state: urlState });
    }
  }, [urlCity, urlState, state]);
  
  // Sync store to URL state
  useEffect(() => {
    // Clear any existing timeout to prevent multiple updates
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }
    
    // Only update if we're not already updating and there's an actual change
    if (!isUpdating.current) {
      if (state.city !== urlCity) {
        isUpdating.current = true;
        setUrlCity(state.city);
      }
      
      if (state.state !== urlState && state.state !== 'wa') {
        isUpdating.current = true;
        setUrlState(state.state);
      }
      
      // Reset the flag after a short delay
      if (isUpdating.current) {
        syncTimeout.current = setTimeout(() => {
          isUpdating.current = false;
          syncTimeout.current = null;
        }, 50);
      }
    }
  }, [state.city, state.state, setUrlCity, setUrlState, urlCity, urlState]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeout.current) {
        clearTimeout(syncTimeout.current);
      }
    };
  }, []);
  
  return state;
}
