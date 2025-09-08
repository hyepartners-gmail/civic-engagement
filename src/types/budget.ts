import { Year } from './common';

// For rollup.json
export interface BudgetYearData {
  outlays: number;
  receipts: number;
  deficit: number;
  debtHeldByPublic?: number;
  grossDebt?: number;
  netInterest?: number;
  mandatory?: number;
  discretionary?: number;
}

export interface BudgetRollup {
  unitMeta?: {
    outlaysDerived: string;
    receiptsDerived: string;
    debt: string;
    notes: string;
  };
  years: Record<Year, BudgetYearData>;
}

// For terms.json
export interface PresidentTerm {
  president: string;
  party: 'Democrat' | 'Republican' | 'Other';
  startFY: Year;
  endFY: Year;
}

// For events.json
export interface EventAnnotation {
  year: Year;
  title: string;
  description?: string;
  tags?: string[];
}

// For macro.json
export interface MacroSeries {
  cpi: Record<Year, number>; // CPI index (base documented)
  gdp: Record<Year, number>; // Nominal GDP
  interestRateScenarios?: {
    base: Record<Year, number>;
    low: Record<Year, number>;
    high: Record<Year, number>;
  };
}

// For hierarchy.json
export interface BudgetHierarchyData {
  units: {
    values_nominal: string;
    alt_budgetAuthority: string;
  };
  nodes: BudgetNode[];
}

export interface BudgetNode {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3;
  kind: 'root' | 'function' | 'subfunction' | 'account';
  parentId?: string;
  path: string[];
  values: Record<Year, { nominal: number }>;
}

// For scenarios (placeholder for now)
export interface Scenario {
  year: Year;
  deltas: Record<string, number>;
}

export interface Projection {
  tenYear: Array<{
    year: Year;
    outlays: number;
    receipts: number;
    deficit: number;
    debt: number;
    netInterest: number;
  }>;
}

// New interface for the raw CBO projection data structure
export interface RawCBOProjectionData {
  source: string;
  sources_used: Record<string, string>;
  rows: Array<{
    fy: number;
    revenues_bil: number;
    outlays_bil: number;
    deficit_bil: number;
    net_interest_bil: number;
    debt_held_by_public_bil: number;
    gdp_bil: number;
    discretionary_bil?: number; // Add optional discretionary
    mandatory_bil?: number; // Add optional mandatory
  }>;
  series: Record<string, Record<string, number>>;
  notes: string;
}