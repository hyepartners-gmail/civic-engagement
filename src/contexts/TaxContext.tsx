"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { TaxPolicyBundle } from '../types/tax';
import { baselinePolicy } from '@/lib/baselinePolicies'; // Import the centralized baseline

interface TaxContextType {
  policy: TaxPolicyBundle;
  setPolicy: (policy: TaxPolicyBundle) => void;
  resetPolicy: () => void;
}

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export function TaxProvider({ children }: { children: React.ReactNode }) {
  const [policy, setPolicy] = useState<TaxPolicyBundle>(baselinePolicy);

  const resetPolicy = useCallback(() => {
    setPolicy(baselinePolicy);
  }, []);

  return (
    <TaxContext.Provider value={{
      policy,
      setPolicy,
      resetPolicy,
    }}>
      {children}
    </TaxContext.Provider>
  );
}

export function useTax() {
  const context = useContext(TaxContext);
  if (context === undefined) {
    throw new Error('useTax must be used within a TaxProvider');
  }
  return context;
}