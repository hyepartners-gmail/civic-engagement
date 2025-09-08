"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSSRSafeDebounce } from './useSSRSafeDebounce';
import LZString from 'lz-string';
import { z } from 'zod';

export type FuelType = 'Coal' | 'Natural Gas' | 'Nuclear' | 'Hydro' | 'Wind' | 'Solar' | 'Other';

export const ALL_FUEL_TYPES: FuelType[] = ['Coal', 'Natural Gas', 'Nuclear', 'Hydro', 'Wind', 'Solar', 'Other'];

export type RegionalMetric = 'none' | 'capacity' | 'emissions' | 'generation';

export interface EnergyState {
  fuelTypes: FuelType[];
  co2Max: number;
  capacityMin: number;
  regionalMetric: RegionalMetric;
  showRpsOverlay: boolean;
}

const energyParam = 'e';

const urlStateSchema = z.object({
  f: z.array(z.string()).optional(), // fuelTypes
  c: z.number().optional(), // co2Max
  m: z.number().optional(), // capacityMin
});

function encodeState(state: EnergyState): string {
  const obj = {
    f: state.fuelTypes,
    c: state.co2Max,
    m: state.capacityMin,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(obj));
}

function decodeState(encoded: string): Partial<EnergyState> {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return {};
    const raw = JSON.parse(json);
    const parsed = urlStateSchema.partial().parse(raw);
    return {
      fuelTypes: parsed.f as EnergyState['fuelTypes'],
      co2Max: parsed.c,
      capacityMin: parsed.m,
    };
  } catch {
    return {};
  }
}

const defaultState: EnergyState = {
  fuelTypes: [...ALL_FUEL_TYPES],
  co2Max: 1200, // kg/MWh
  capacityMin: 100, // MW
  // regionalMetric: 'none',
  regionalMetric: 'generation', 
  showRpsOverlay: false,
};

export function useEnergyState() {
  const [state, setState] = useState<EnergyState>(defaultState);
  const router = useRouter();
  const isInitialLoad = useRef(true);
  const [isClient, setIsClient] = useState(false);
  
  // Track if we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const debouncedState = useSSRSafeDebounce(state, 300);

  // On initial load, read from URL and set state
  useEffect(() => {
    if (isClient && isInitialLoad.current && router.isReady) {
      const urlParam = router.query[energyParam];
      if (typeof urlParam === 'string') {
        const decodedState = decodeState(urlParam);
        setState(prev => ({ ...prev, ...decodedState }));
      }
      isInitialLoad.current = false;
    }
  }, [isClient, router.isReady, router.query]);

  // On state change, update URL - but only for climate/energy page
  // and only when not fetching JSON data (avoids conflicts with data loading)
  useEffect(() => {
    if (isClient && !isInitialLoad.current && router.isReady) {
      // Only update URL for the energy page, not for data fetching routes
      if (router.pathname === '/climate/energy' && !router.pathname.includes('.json')) {
        try {
          const encoded = encodeState(debouncedState);
          const newQuery = { ...router.query, [energyParam]: encoded };
          
          // Do not update URL if it's the same as current state
          const currentParam = router.query[energyParam];
          if (currentParam !== encoded) {
            router.replace(
              { query: newQuery },
              undefined,
              { shallow: true }
            );
          }
        } catch (error) {
          console.error('Error updating URL state:', error);
        }
      }
    }
  }, [isClient, debouncedState, router]);

  const updateState = useCallback((newState: Partial<EnergyState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(defaultState);
  }, []);

  return { ...state, setState: updateState, resetFilters };
}