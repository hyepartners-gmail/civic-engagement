"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

interface CrosshairContextType {
  hoveredYear: number | null;
  setHoveredYear: (year: number | null) => void;
}

const CrosshairContext = createContext<CrosshairContextType | undefined>(undefined);

export function CrosshairProvider({ children }: { children: React.ReactNode }) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const setHoveredYearCallback = useCallback((year: number | null) => {
    setHoveredYear(year);
  }, []);

  return (
    <CrosshairContext.Provider value={{
      hoveredYear,
      setHoveredYear: setHoveredYearCallback,
    }}>
      {children}
    </CrosshairContext.Provider>
  );
}

export function useCrosshairBus() {
  const context = useContext(CrosshairContext);
  if (context === undefined) {
    throw new Error('useCrosshairBus must be used within a CrosshairProvider');
  }
  return context;
}

// Removed useReactContextReady as it's no longer needed.