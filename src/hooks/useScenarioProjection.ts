import { useMemo } from 'react';
import { BudgetRollup, MacroSeries, Projection, Scenario, RawCBOProjectionData } from '../types/budget';
import { CustomProgram } from '@/contexts/LabContext';

interface LabScenario extends Scenario {
  customPrograms?: CustomProgram[];
  revenueDeltas?: Record<number, number>;
}

export function useScenarioProjection(
  baseline: BudgetRollup | undefined,
  scenario: LabScenario,
  macro: MacroSeries | undefined,
  cboProjection: RawCBOProjectionData | undefined // Use the new RawCBOProjectionData type
): Record<'base' | 'low' | 'high', Projection['tenYear']> | null {
  return useMemo(() => {
    if (!baseline || !macro || !baseline.years || !macro.interestRateScenarios || !cboProjection) {
      // console.warn("useScenarioProjection: Missing baseline, macro, interestRateScenarios, or CBO projection.");
      return null;
    }
    
    // Convert CBO projection into a map for easier lookup
    // Map CBO data (in billions) to the expected format (in thousands)
    const cboProjectionMap = new Map(cboProjection.rows.map(d => { // Access the 'rows' array here
      // CBO data is in billions, convert to thousands
      const BILLIONS_TO_THOUSANDS = 1e6; // 1 billion = 1,000,000 thousands
      return [d.fy, { // Use 'fy' for the year key
        year: d.fy,
        outlays: d.outlays_bil * BILLIONS_TO_THOUSANDS,
        receipts: d.revenues_bil * BILLIONS_TO_THOUSANDS,
        deficit: d.deficit_bil * BILLIONS_TO_THOUSANDS,
        debt: d.debt_held_by_public_bil * BILLIONS_TO_THOUSANDS,
        netInterest: d.net_interest_bil * BILLIONS_TO_THOUSANDS,
        // Add discretionary/mandatory if available in CBO, otherwise they'll be 0
        discretionary: d.discretionary_bil ? d.discretionary_bil * BILLIONS_TO_THOUSANDS : 0,
        mandatory: d.mandatory_bil ? d.mandatory_bil * BILLIONS_TO_THOUSANDS : 0,
      }];
    }));

    // Determine the unit conversion factor for debt to match outlays/receipts (USD_thousands)
    // This is now handled by the CBO data mapping itself, but keeping for clarity if historical debt is used.
    const debtToThousandsMultiplier = (baseline.unitMeta?.debt === "USD" && baseline.unitMeta?.outlaysDerived === "USD_thousands") ? 1e-3 : 1;

    const projections: Record<'base' | 'low' | 'high', Projection['tenYear']> = {
      base: [],
      low: [],
      high: [],
    };

    const startYear = scenario.year;
    const endYear = startYear + 10;

    // Get the last known historical debt from rollup.json for the year before the projection starts
    let lastHistoricalDebtThousands = (baseline.years[startYear - 1]?.debtHeldByPublic || 0) * debtToThousandsMultiplier;
    
    // If the historical debt is zero or undefined, use a hardcoded value (29T USD in thousands)
    if (!lastHistoricalDebtThousands || lastHistoricalDebtThousands < 1e12 * debtToThousandsMultiplier) {
        const HARDCODED_STARTING_DEBT_USD = 29_000_000_000_000; // 29 Trillion USD
        lastHistoricalDebtThousands = HARDCODED_STARTING_DEBT_USD * debtToThousandsMultiplier;
        // console.warn(`useScenarioProjection: Initial debt for FY${startYear - 1} is missing, zero, or too small. Using hardcoded starting debt: ${lastHistoricalDebtThousands} thousands.`);
    }

    for (const rateScenarioKey of ['base', 'low', 'high'] as const) {
      const projection: Projection['tenYear'] = [];
      let currentYearDebtThousands = lastHistoricalDebtThousands;

      for (let year = startYear; year <= endYear; year++) {
        // Use CBO projection data as the baseline for future years
        let baseYearData = cboProjectionMap.get(year);

        // Fallback to extrapolation if CBO data is not available for a specific year
        if (!baseYearData) {
            // console.warn(`useScenarioProjection: Missing CBO data for year ${year}. Extrapolating from previous year's projection.`);
            // Extrapolate from the last projected year's values if CBO data runs out
            const lastProjected = projection[projection.length - 1];
            if (lastProjected) {
                baseYearData = {
                    year: year,
                    outlays: lastProjected.outlays,
                    receipts: lastProjected.receipts,
                    deficit: lastProjected.deficit,
                    debt: lastProjected.debt, // This will be overwritten by cumulative calculation
                    netInterest: lastProjected.netInterest,
                    discretionary: 0,
                    mandatory: 0,
                };
            } else {
                // If no CBO data and no previous projection, use baseline from rollup (should only happen for startYear if CBO is missing)
                const rollupData = baseline.years[year];
                baseYearData = {
                    year: year, 
                    outlays: rollupData?.outlays || 0, 
                    receipts: rollupData?.receipts || 0, 
                    deficit: rollupData?.deficit || 0, 
                    debt: rollupData?.debtHeldByPublic || 0, 
                    netInterest: rollupData?.netInterest || 0,
                    discretionary: 0,
                    mandatory: 0,
                };
            }
        }

        let projectedOutlays = baseYearData.outlays;
        let projectedReceipts = baseYearData.receipts;

        // Apply scenario deltas (spending and revenue changes)
        let outlayDelta = 0;
        
        // Get baseline function spending amounts from rollup data for the base year
        const baseYear = startYear - 1; // Use previous year as baseline
        const baselineData = baseline.years[baseYear];
        
        if (baselineData) {
          Object.entries(scenario.deltas).forEach(([funcId, deltaPct]) => {
            // Estimate function spending as percentage of total outlays
            // This is a simplified mapping - in reality we'd use the full hierarchy data
            const functionSpendingShares: Record<string, number> = {
              'func:050': 0.16, // National Defense (~16% of total outlays)
              'func:600': 0.15, // Income Security (~15%)
              'func:570': 0.14, // Medicare (~14%)
              'func:550': 0.08, // Health (~8%)
              'func:700': 0.04, // Veterans Benefits (~4%)
              'func:500': 0.03, // Education (~3%)
              'func:400': 0.03, // Transportation (~3%)
              'func:300': 0.015, // Natural Resources (~1.5%)
              'func:250': 0.015, // Science/Space (~1.5%)
              'func:370': 0.015, // Commerce (~1.5%)
              'func:450': 0.015, // Community Development (~1.5%)
              'func:270': 0.01, // Energy (~1%)
              'func:800': 0.01, // General Government (~1%)
              'func:900': 0.05, // Net Interest (~5%)
            };
            
            const functionShare = functionSpendingShares[funcId] || 0.01; // Default 1% if unknown
            const estimatedFunctionSpending = baselineData.outlays * functionShare;
            outlayDelta += estimatedFunctionSpending * (deltaPct as number);
          });
        }

        // Revenue deltas are expected to be in billions (from useRevenueImpact), convert to thousands
        let receiptDelta = (scenario.revenueDeltas?.[year] || 0) * 1e6;

        scenario.customPrograms?.forEach(program => {
          if (program.type === 'spending') outlayDelta += program.amount * 1e6;
          else receiptDelta += program.amount * 1e6;
        });

        projectedOutlays += outlayDelta;
        projectedReceipts += receiptDelta;
        
        const projectedDeficit = projectedOutlays - projectedReceipts;

        // Calculate debt cumulatively based on previous year's debt and current year's deficit
        const projectedDebt = currentYearDebtThousands + projectedDeficit;

        let finalInterestRateForYear: number;
        const initialInterestRate = macro.interestRateScenarios[rateScenarioKey]?.[year];

        if (initialInterestRate === undefined) {
            let fallbackRate: number | undefined;
            for (let y = year - 1; y >= 1962; y--) {
                if (macro.interestRateScenarios[rateScenarioKey]?.[y] !== undefined) {
                    fallbackRate = macro.interestRateScenarios[rateScenarioKey][y];
                    break;
                }
            }
            if (fallbackRate === undefined) {
                for (let y = year + 1; y <= 2035; y++) {
                    if (macro.interestRateScenarios[rateScenarioKey]?.[y] !== undefined) {
                        fallbackRate = macro.interestRateScenarios[rateScenarioKey][y];
                        break;
                    }
                }
            }
            finalInterestRateForYear = fallbackRate ?? 0.03;
        } else {
            finalInterestRateForYear = initialInterestRate;
        }

        const projectedNetInterest = projectedDebt * finalInterestRateForYear;

        projection.push({
          year,
          outlays: projectedOutlays,
          receipts: projectedReceipts,
          deficit: projectedDeficit,
          debt: projectedDebt,
          netInterest: projectedNetInterest,
        });

        currentYearDebtThousands = projectedDebt; // Update for next iteration
      }
      projections[rateScenarioKey] = projection;
    }

    return projections;
  }, [baseline, scenario, macro, cboProjection]);
}