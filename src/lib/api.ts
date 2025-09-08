import { z } from 'zod';
import { BudgetRollup, BudgetNode, PresidentTerm, EventAnnotation, MacroSeries, RawCBOProjectionData, BudgetHierarchyData } from '../types/budget';
import { TaxPolicyBundle, IncomeDistribution } from '../types/tax';

const base = process.env.NEXT_PUBLIC_DATA_BASE || '/federal_budget';

export async function fetchJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${base}/${path}`);
  if (!r.ok) throw new Error(`Failed to fetch ${path}`);
  return r.json() as Promise<T>;
}

export const fetchBudgetRollup = () => fetchJSON<BudgetRollup>('rollup.json');
export const fetchBudgetHierarchy = () => fetchJSON<BudgetHierarchyData>('hierarchy.json');
export const fetchPresidentTerms = () => fetchJSON<PresidentTerm[]>('terms.json');
export const fetchEvents = () => fetchJSON<EventAnnotation[]>('events.json');
export const fetchMacroSeries = () => fetchJSON<MacroSeries>('macro.json');
export const fetchBaselineTaxPolicy = () => fetchJSON<TaxPolicyBundle>('tax_policy.json');
export const fetchIncomeDistribution = () => fetchJSON<IncomeDistribution>('income_distribution.json');
export const fetchCBOProjection = () => fetchJSON<RawCBOProjectionData>('cbo_projection.json');