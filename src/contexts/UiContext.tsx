"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Year } from '../types/common';
import { PresidentTerm } from '../types/budget';

type Mode = 'nominal' | 'real' | '%GDP';

export interface PinnedTerm extends PresidentTerm {}

interface UiContextType {
  year: Year;
  setYear: (year: Year) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  selectedNodeId?: string;
  setSelectedNodeId: (id?: string) => void;
  pinnedTerms: PinnedTerm[];
  pinTerm: (term: PinnedTerm) => void;
  unpinTerm: (startFY: Year) => void;
  highlightedNodeIds: string[];
  setHighlightedNodeIds: (ids: string[]) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

// Set the default year to 2024 as requested.
const getInitialYear = (): Year => {
  return 2024;
};

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState<Year>(getInitialYear());
  const [mode, setMode] = useState<Mode>('%GDP');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [pinnedTerms, setPinnedTerms] = useState<PinnedTerm[]>([]);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Add state here, default to closed

  const pinTerm = useCallback((term: PinnedTerm) => {
    setPinnedTerms(prev => [
      ...prev.filter(p => p.startFY !== term.startFY),
      term
    ].slice(-3));
  }, []);

  const unpinTerm = useCallback((startFY: Year) => {
    setPinnedTerms(prev => prev.filter(t => t.startFY !== startFY));
  }, []);

  return (
    <UiContext.Provider value={{
      year,
      setYear,
      mode,
      setMode,
      selectedNodeId,
      setSelectedNodeId,
      pinnedTerms,
      pinTerm,
      unpinTerm,
      highlightedNodeIds,
      setHighlightedNodeIds,
      isSidebarOpen,
      setIsSidebarOpen,
    }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const context = useContext(UiContext);
  if (context === undefined) {
    throw new Error('useUi must be used within a UiProvider');
  }
  return context;
}