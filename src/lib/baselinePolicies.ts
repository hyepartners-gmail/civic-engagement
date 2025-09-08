import { TaxPolicyBundle } from '@/types/tax';

// Based on 2025 U.S. Federal Tax Brackets & Thresholds
export const baselinePolicy: TaxPolicyBundle = {
  incomeTax: {
    single: {
      brackets: [
        { threshold: 0, rate: 0.10 },
        { threshold: 11926, rate: 0.12 },
        { threshold: 48476, rate: 0.22 },
        { threshold: 103351, rate: 0.24 },
        { threshold: 197301, rate: 0.32 },
        { threshold: 250526, rate: 0.35 },
        { threshold: 626351, rate: 0.37 },
      ],
      standardDeduction: 14600, // Example 2025 single standard deduction
    },
    married_joint: {
      brackets: [
        { threshold: 0, rate: 0.10 },
        { threshold: 23851, rate: 0.12 },
        { threshold: 96951, rate: 0.22 },
        { threshold: 206701, rate: 0.24 },
        { threshold: 394601, rate: 0.32 },
        { threshold: 501051, rate: 0.35 },
        { threshold: 751601, rate: 0.37 },
      ],
      standardDeduction: 29200, // Example 2025 married filing jointly standard deduction
    },
  },
  altTaxes: {
    vat: { rate: 0, basePct: 0.5 },
    wealth: { threshold: 1_000_000_000, rate: 0 },
    carbon: { ratePerTon: 0, coveragePct: 0.5, dividendPct: 0 },
  },
};