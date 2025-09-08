import { Year } from './common';

// Personal estimator (client-side only)
export interface TaxCalcInput {
  year: Year;
  income: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'hoh';
  dependents?: number;
  deductionsApprox?: number;
  payrollIncluded?: boolean;
}

// For income_distribution.json
export interface IncomeBin {
  lower: number;
  upper: number;
  num_returns: number;
  avg_income: number;
  median_income: number;
  share_of_total_income: number;
}

export interface IncomeDistribution {
  source: string;
  years: number[];
  bin_width: number;
  bins: IncomeBin[];
}

// Tax policy model (for /budget/taxes and lab revenue levers)
export interface TaxBracket {
  threshold: number; // income >= threshold
  rate: number; // marginal rate, 0..1
}

export interface IncomeTaxPolicy {
  brackets: TaxBracket[];
  standardDeduction: number;
  payrollRate?: number; // simplified toggle
}

export interface AltTaxPolicy {
  vat?: { rate: number; basePct: number; exemptions?: string[] };
  wealth?: { threshold: number; rate: number };
  carbon?: { ratePerTon: number; coveragePct: number; dividendPct?: number };
}

export interface TaxPolicyBundle {
  incomeTax: {
    single: IncomeTaxPolicy;
    married_joint: IncomeTaxPolicy;
  };
  altTaxes?: AltTaxPolicy;
  history?: Record<Year, {
    brackets: TaxBracket[];
    standardDeduction: number;
    exemptions?: {
      single?: number;
      marriedJoint?: number;
      dependents?: number;
    };
    lowestBracket?: {
      rate?: number;
      thresholdMarriedJoint_under?: number;
    };
    highestBracket?: {
      rate?: number;
      thresholdMarriedJoint_over?: number;
    };
  }>;
}

export interface RevenueImpact {
  byYear: Record<Year, number>; // +/− receipts vs baseline
  distribution?: Array<{ percentile: string; delta: number }>; // incidence est.
}