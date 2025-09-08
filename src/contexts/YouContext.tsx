"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { TaxCalcInput } from '../types/tax';

const LATEST_POLICY_YEAR = 2023; // Based on available TPC data

export const PEER_PROFILES: Record<string, { name: string; input: TaxCalcInput }> = {
  median: {
    name: 'Median Household',
    input: {
      year: LATEST_POLICY_YEAR,
      income: 74580,
      filingStatus: 'married_joint',
      dependents: 1,
    },
  },
  top10: {
    name: 'Top 10% Earner',
    input: {
      year: LATEST_POLICY_YEAR,
      income: 250000,
      filingStatus: 'married_joint',
      dependents: 2,
    },
  },
  bottom20: {
    name: 'Bottom 20% Earner',
    input: {
      year: LATEST_POLICY_YEAR,
      income: 28000,
      filingStatus: 'single',
      dependents: 0,
    },
  },
};

// Define the structure of the scenario for YouContext
export interface YouScenario {
  input: TaxCalcInput;
  spendingDelta: number; // e.g., 0.05 for +5%
  taxDelta: number; // e.g., 0.02 for +2pp
  selectedFunctionId: string; // e.g., 'func:050' for National Defense
  deltas: Record<string, number>; // This is what PolicySliderLite needs
}

interface YouContextType {
  scenario: YouScenario; // Now the context provides the full scenario
  setInput: (input: Partial<TaxCalcInput>) => void;
  setDeltas: (deltas: Partial<Pick<YouScenario, 'spendingDelta' | 'taxDelta' | 'selectedFunctionId' | 'deltas'>>) => void; // Add deltas to partial
  resetInput: () => void;
}

const YouContext = createContext<YouContextType | undefined>(undefined);

const initialYouScenario: YouScenario = {
  input: {
    ...PEER_PROFILES.median.input,
    filingStatus: 'married_joint', // Default to married_joint
  },
  spendingDelta: 0,
  taxDelta: 0,
  selectedFunctionId: 'func:050', // Default to National Defense
  deltas: {}, // Initialize deltas here
};

export function YouProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenarioState] = useState<YouScenario>(initialYouScenario);

  const setInput = useCallback((newInput: Partial<TaxCalcInput>) => {
    setScenarioState(prev => ({
      ...prev,
      input: { ...prev.input, ...newInput }
    }));
  }, []);

  const setDeltas = useCallback((newDeltas: Partial<Pick<YouScenario, 'spendingDelta' | 'taxDelta' | 'selectedFunctionId' | 'deltas'>>) => {
    setScenarioState(prev => ({
      ...prev,
      ...newDeltas, // This will update spendingDelta, taxDelta, selectedFunctionId directly
      deltas: newDeltas.deltas !== undefined ? newDeltas.deltas : prev.deltas // Update deltas if provided
    }));
  }, []);

  const resetInput = useCallback(() => {
    setScenarioState(initialYouScenario);
  }, []);

  return (
    <YouContext.Provider value={{
      scenario,
      setInput,
      setDeltas,
      resetInput,
    }}>
      {children}
    </YouContext.Provider>
  );
}

export function useYou() {
  const context = useContext(YouContext);
  if (context === undefined) {
    throw new Error('useYou must be used within a YouProvider');
  }
  return context;
}