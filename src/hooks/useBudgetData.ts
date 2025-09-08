import { useQueries } from '@tanstack/react-query';
import {
  fetchBudgetRollup,
  fetchMacroSeries,
  fetchPresidentTerms,
  fetchBudgetHierarchy,
  fetchEvents,
  fetchBaselineTaxPolicy,
  fetchCBOProjection,
} from '@/lib/api';
import { BudgetRollup, MacroSeries, PresidentTerm, BudgetHierarchyData, EventAnnotation, RawCBOProjectionData } from '@/types/budget';
import { TaxPolicyBundle } from '@/types/tax';

export function useBudgetData() {
  const results = useQueries({
    queries: [
      { queryKey: ['budgetRollup'], queryFn: fetchBudgetRollup, staleTime: Infinity },
      { queryKey: ['macroSeries'], queryFn: fetchMacroSeries, staleTime: Infinity },
      { queryKey: ['presidentTerms'], queryFn: fetchPresidentTerms, staleTime: Infinity },
      { queryKey: ['budgetHierarchy'], queryFn: fetchBudgetHierarchy, staleTime: Infinity },
      { queryKey: ['budgetEvents'], queryFn: fetchEvents, staleTime: Infinity },
      { queryKey: ['baselineTaxPolicy'], queryFn: fetchBaselineTaxPolicy, staleTime: Infinity },
      { queryKey: ['cboProjection'], queryFn: fetchCBOProjection, staleTime: Infinity },
    ],
  });

  const [
    rollupQuery,
    macroQuery,
    termsQuery,
    hierarchyQuery,
    eventsQuery,
    taxPolicyQuery,
    cboProjectionQuery,
  ] = results;

  const isLoading = results.some((query) => query.isLoading);
  const isError = results.some((query) => query.isError);
  const error = results.find((query) => query.isError)?.error;

  return {
    rollup: rollupQuery.data,
    macro: macroQuery.data,
    terms: termsQuery.data,
    hierarchy: hierarchyQuery.data,
    events: eventsQuery.data,
    taxPolicy: taxPolicyQuery.data,
    cboProjection: cboProjectionQuery.data,
    cpiSeries: macroQuery.data, // CPI data is part of macroSeries
    isLoading,
    isError,
    error,
  };
}