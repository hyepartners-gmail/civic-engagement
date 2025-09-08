import { useMemo } from 'react';
import { TaxPolicyBundle, IncomeTaxPolicy, IncomeDistribution } from '../types/tax';
import { BudgetRollup, MacroSeries } from '@/types';

// Helper types for clarity in new functions
type Bracket = { threshold: number; rate: number; upper?: number | null };
type Policy = { standardDeduction: number; brackets: Bracket[] };

// Define filing status shares at the top level
const FILING_STATUS_SHARES = { single: 0.5, married_joint: 0.5 };

// Helper to calculate the portion of taxable income that falls within a specific bracket band
function taxablePortionInBracket(taxable: number, lower: number, upper: number | null): number {
  if (taxable <= lower) return 0;
  const hi = upper == null ? taxable : Math.min(taxable, upper);
  return Math.max(0, hi - lower);
}

// Helper to find the marginal rate at a given income level within a policy's bracket structure
function rateAt(brackets: Bracket[], income: number): number {
  // Assumes brackets are sorted by increasing threshold
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income >= brackets[i].threshold) {
      return brackets[i].rate;
    }
  }
  return 0; // Should not happen if 0 threshold exists, but as a fallback
}

// Direct delta calculation: sum( portion_in_bracket * (current_rate - baseline_rate) )
function deltaTaxDirect(income: number, baselinePolicy: Policy, currentPolicy: Policy): number {
  const taxableBase = Math.max(0, income - baselinePolicy.standardDeduction);
  const taxableCurr = Math.max(0, income - currentPolicy.standardDeduction);

  // Build merged edges from both policies to avoid edge leaks.
  const edges = new Set<number>([0]); // Always start from 0
  baselinePolicy.brackets.forEach(b => edges.add(b.threshold));
  currentPolicy.brackets.forEach(b => edges.add(b.threshold));
  
  // Add upper bounds of brackets as edges if they are explicitly defined
  baselinePolicy.brackets.forEach(b => { if (b.upper != null) edges.add(b.upper); });
  currentPolicy.brackets.forEach(b => { if (b.upper != null) edges.add(b.upper); });

  const sortedEdges = Array.from(edges).sort((a, b) => a - b);

  let delta = 0;
  for (let i = 0; i < sortedEdges.length; i++) {
    const lowerEdge = sortedEdges[i];
    const upperEdge: number | null = i + 1 < sortedEdges.length ? sortedEdges[i + 1] : null;

    const baseRate = rateAt(baselinePolicy.brackets, lowerEdge);
    const currRate = rateAt(currentPolicy.brackets, lowerEdge);
    const dRate = currRate - baseRate; // Corrected: current_rate - baseline_rate

    if (dRate === 0) continue;

    // Calculate the portion of income in this band for both policies' taxable income
    const basePortion = taxablePortionInBracket(taxableBase, lowerEdge, upperEdge);
    const currPortion = taxablePortionInBracket(taxableCurr, lowerEdge, upperEdge);

    // Only the *overlap* of taxed dollars matters. Use the smaller taxed portion.
    // This prevents deduction shifts from creating delta where nothing is taxed.
    const affectedPortion = Math.min(basePortion, currPortion);
    
    if (affectedPortion > 0) {
      delta += affectedPortion * dRate;
    }
  }
  return delta;
}

// Helper to calculate absolute revenue from alternative taxes
function calculateAltTaxRevenue(
  policy: TaxPolicyBundle,
  macro: MacroSeries,
  year: number
) {
  const altTaxes = policy.altTaxes || {};
  let totalRevenue = 0;

  // This is a simplified model and would be more complex in a real application
  if (altTaxes.vat && altTaxes.vat.rate > 0) {
    // Assuming total AGI is roughly 15 trillion USD (in thousands of dollars)
    // This is a placeholder as SOI data doesn't provide total AGI directly in the new format
    const ESTIMATED_TOTAL_AGI_THOUSANDS = 15_000_000_000_000; // 15 Trillion USD in thousands
    const estimatedConsumption = ESTIMATED_TOTAL_AGI_THOUSANDS * 0.85; // Assume 85% of AGI is consumed
    const vatRevenue = estimatedConsumption * (altTaxes.vat.basePct || 0) * altTaxes.vat.rate;
    totalRevenue += vatRevenue;
  }

  if (altTaxes.wealth && altTaxes.wealth.rate > 0) {
    // Assume total US wealth is $200 trillion (in thousands of dollars)
    const TOTAL_US_WEALTH_THOUSANDS = 400_000_000_000; // 400 billion thousands (400 trillion dollars)
    
    // For demonstration, apply wealth tax rate to a significant portion of national wealth.
    // This is a simplification to ensure the slider has a visible impact on the projection.
    // In a real model, this would be based on detailed wealth distribution data and specific thresholds.
    const taxableWealthBaseThousands = TOTAL_US_WEALTH_THOUSANDS * 0.5; // Assume 50% of national wealth is the taxable base for wealth tax

    const wealthTaxRevenue = taxableWealthBaseThousands * altTaxes.wealth.rate;
    totalRevenue += wealthTaxRevenue;
  }

  if (altTaxes.carbon && altTaxes.carbon.ratePerTon > 0) {
    const emissionsTons = 5e9; // Hardcoded national emissions in tons
    const carbonRevenue = emissionsTons * altTaxes.carbon.ratePerTon * (altTaxes.carbon.coveragePct || 0);
    totalRevenue += carbonRevenue;
  }

  return totalRevenue;
}

// Function to determine which display bracket an income falls into
function getDisplayBracketIndex(income: number, displayBrackets: Bracket[], standardDeduction: number): number {
  const taxable = Math.max(0, income - standardDeduction);
  for (let i = 0; i < displayBrackets.length; i++) {
    const bracket = displayBrackets[i];
    const upperLimit = bracket.upper ?? Infinity;
    if (taxable >= bracket.threshold && taxable < upperLimit) {
      return i;
    }
  }
  return displayBrackets.length - 1; // Fallback to the last bracket
}

// Helper to prepare policy with upper bounds for brackets
function preparePolicy(taxPolicy: IncomeTaxPolicy): Policy {
  const sortedBrackets = [...taxPolicy.brackets].sort((a, b) => a.threshold - b.threshold);
  const bracketsWithUpper = sortedBrackets.map((b, i, arr) => ({
    ...b,
    upper: arr[i + 1] ? arr[i + 1].threshold : null // Upper bound is the next bracket's threshold
  }));
  return {
    standardDeduction: taxPolicy.standardDeduction,
    brackets: bracketsWithUpper
  };
}

export function useRevenueImpact(
  currentPolicy: TaxPolicyBundle | undefined,
  baselinePolicy: TaxPolicyBundle | undefined,
  incomeDistribution: IncomeDistribution | undefined,
  rollup: BudgetRollup | undefined,
  macro: MacroSeries | undefined
) {
  return useMemo(() => {
    if (!currentPolicy || !baselinePolicy || !rollup || !macro || !incomeDistribution) {
      return { byYear: {}, distribution: [], cumulative: 0 };
    }

    // Add a specific guard for incomeTax property
    if (!baselinePolicy.incomeTax || !currentPolicy.incomeTax) {
      console.error("useRevenueImpact: incomeTax property is missing from baselinePolicy or currentPolicy.", { baselineHasIncomeTax: !!baselinePolicy.incomeTax, currentHasIncomeTax: !!currentPolicy.incomeTax });
      return { byYear: {}, distribution: [], cumulative: 0 };
    }

    const year = new Date().getFullYear() - 1; // Use previous year for income distribution data

    // Prepare policies for direct delta calculation, including upper bounds for brackets
    const baselineSinglePolicy: Policy = preparePolicy(baselinePolicy.incomeTax.single);
    const baselineMarriedPolicy: Policy = preparePolicy(baselinePolicy.incomeTax.married_joint);
    const currentSinglePolicy: Policy = preparePolicy(currentPolicy.incomeTax.single);
    const currentMarriedPolicy: Policy = preparePolicy(currentPolicy.incomeTax.married_joint);

    // Initialize display bar deltas (based on current married_joint brackets for consistency with chart)
    const displayBrackets = preparePolicy(currentPolicy.incomeTax.married_joint).brackets;
    const barDeltas = new Array<number>(displayBrackets.length).fill(0);

    const NUM_SAMPLES_PER_BIN = 8; // Number of sample points within each bin

    // Iterate through income distribution bins
    for (const bin of incomeDistribution.bins) {
      const binLow = bin.lower;
      const binHigh = bin.upper;
      const numReturns = bin.num_returns;

      const sampleStep = (binHigh - binLow) === 0 ? 0 : (binHigh - binLow) / NUM_SAMPLES_PER_BIN;

      for (let s = 0; s < NUM_SAMPLES_PER_BIN; s++) {
        const sampleIncome = binLow + sampleStep * (s + 0.5); // Mid-point sampling

        // Calculate direct tax delta for single and married filers
        const dSingle = deltaTaxDirect(sampleIncome, baselineSinglePolicy, currentSinglePolicy);
        const dMarried = deltaTaxDirect(sampleIncome, baselineMarriedPolicy, currentMarriedPolicy);

        // Weighted average delta per return for this slice
        const avgDeltaPerReturn = (FILING_STATUS_SHARES.single * dSingle + FILING_STATUS_SHARES.married_joint * dMarried);
        
        // Total delta for this slice, scaled by its portion of total returns in the bin
        const sliceDelta = avgDeltaPerReturn * (numReturns / NUM_SAMPLES_PER_BIN);

        // Determine which display bracket this sample income falls into under the CURRENT policy
        const bIdx = getDisplayBracketIndex(sampleIncome, displayBrackets, currentMarriedPolicy.standardDeduction);
        
        // Accumulate slice delta into the correct display bar
        barDeltas[bIdx] += sliceDelta;
      }
    }

    // Numeric hygiene: zero out noise under a cent per return scale
    for (let i = 0; i < barDeltas.length; i++) {
      if (Math.abs(barDeltas[i]) < 1e-2) barDeltas[i] = 0;
    }

    // Format for chart display
    const aggregatedDistribution = barDeltas.map((delta, i) => ({
      bracket: { min: displayBrackets[i].threshold, max: displayBrackets[i].upper ?? null },
      delta: delta,
    }));

    // Calculate alternative tax revenue delta
    const baselineAltTaxRevenue = calculateAltTaxRevenue(baselinePolicy, macro, year);
    const currentAltTaxRevenue = calculateAltTaxRevenue(currentPolicy, macro, year);
    const altTaxDelta = currentAltTaxRevenue - baselineAltTaxRevenue; // Corrected: current_revenue - baseline_revenue

    // Total annual change in revenue (in raw dollars)
    const annualDeltaRawDollars = barDeltas.reduce((sum, d) => sum + d, 0) + altTaxDelta; 
    
    const byYear: Record<number, number> = {};
    let cumulative = 0;
    for (let i = 0; i < 10; i++) {
      const projectionYear = year + i;
      // Values are now consistently in raw dollars
      byYear[projectionYear] = annualDeltaRawDollars; 
      cumulative += annualDeltaRawDollars;
    }

    return { byYear, distribution: aggregatedDistribution, cumulative };
  }, [currentPolicy, baselinePolicy, incomeDistribution, rollup, macro]);
}