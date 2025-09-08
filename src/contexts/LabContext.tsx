"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Scenario } from '../types/budget';
import { TaxPolicyBundle } from '../types/tax';
import fastDeepEqual from 'fast-deep-equal';

export interface CustomProgram {
  id: string;
  name: string;
  type: 'spending' | 'revenue';
  amount: number; // annual amount in billions
  functionId: string; // which budget function it belongs to
}

export interface LabScenario extends Omit<Scenario, 'taxPolicy'> {
  taxPolicy?: Partial<TaxPolicyBundle>;
  customPrograms?: CustomProgram[];
  revenueDeltas?: Record<number, number>;
}

interface LabContextType {
  scenario: LabScenario;
  history: LabScenario[];
  setScenario: (scenario: LabScenario, fromHistory?: boolean) => void;
  resetScenario: () => void;
  addCustomProgram: (program: Omit<CustomProgram, 'id'>) => void;
  removeCustomProgram: (programId: string) => void;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

// Get current year safely for both SSR and client
const getCurrentYear = () => {
  if (typeof window === 'undefined') {
    return 2024; // Default for SSR
  }
  return new Date().getFullYear();
};

const initialScenario: LabScenario = {
  year: getCurrentYear(),
  deltas: {},
  customPrograms: [],
};

export { initialScenario };

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [scenario, setScenarioState] = useState<LabScenario>(initialScenario);
  const [history, setHistory] = useState<LabScenario[]>([]);

  const setScenario = useCallback((newScenario: LabScenario, fromHistory = false) => {
    setScenarioState(currentScenario => {
      const isMeaningfulChange = !fastDeepEqual(currentScenario, newScenario);
      
      if (isMeaningfulChange && !fromHistory && !fastDeepEqual(initialScenario, currentScenario)) {
        setHistory(prev => [currentScenario, ...prev].slice(0, 5));
      }
      
      return newScenario;
    });
  }, []);

  const resetScenario = useCallback(() => {
    setScenarioState(currentScenario => {
      setHistory(prev => [currentScenario, ...prev].slice(0, 5));
      return initialScenario;
    });
  }, []);

  const addCustomProgram = useCallback((program: Omit<CustomProgram, 'id'>) => {
    setScenarioState(currentScenario => {
      const newScenario = {
        ...currentScenario,
        customPrograms: [
          ...(currentScenario.customPrograms || []),
          { ...program, id: `custom-${Date.now()}` }
        ]
      };
      setHistory(prev => [currentScenario, ...prev].slice(0, 5));
      return newScenario;
    });
  }, []);

  const removeCustomProgram = useCallback((programId: string) => {
    setScenarioState(currentScenario => {
      const newScenario = {
        ...currentScenario,
        customPrograms: currentScenario.customPrograms?.filter(p => p.id !== programId)
      };
      setHistory(prev => [currentScenario, ...prev].slice(0, 5));
      return newScenario;
    });
  }, []);

  return (
    <LabContext.Provider value={{
      scenario,
      history,
      setScenario,
      resetScenario,
      addCustomProgram,
      removeCustomProgram,
    }}>
      {children}
    </LabContext.Provider>
  );
}

export function useLab() {
  const context = useContext(LabContext);
  if (context === undefined) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
}