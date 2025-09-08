import { BudgetRollup, BudgetYearData, MacroSeries } from '@/types/budget';
import { Year } from '@/types/common';
import { toPctGDP, toRealUSD } from '@/utils/transform';

type Mode = 'nominal' | 'real' | '%GDP';

const transformValue = (value: number, year: Year, macro: MacroSeries, mode: Mode) => {
  if (mode === 'real') return toRealUSD(value, year, macro);
  if (mode === '%GDP') return toPctGDP(value, year, macro);
  return value;
};

export function selectTotals(rollup: BudgetRollup, macro: MacroSeries, year: Year, mode: Mode) {
  if (!rollup?.years) return { outlays: 0, receipts: 0, deficit: 0, debt: 0, netInterest: 0 };
  const y = rollup.years[year];
  if (!y) {
    return { outlays: 0, receipts: 0, deficit: 0, debt: 0, netInterest: 0 };
  }

  const transform = (val: number) => transformValue(val, year, macro, mode);

  return {
    outlays: transform(y.outlays),
    receipts: transform(y.receipts),
    deficit: transform(y.deficit),
    debt: transform(y.debtHeldByPublic ?? y.grossDebt ?? 0),
    netInterest: transform(y.netInterest ?? 0),
  };
}

export function selectStackedSeries(rollup: BudgetRollup, macro: MacroSeries, mode: Mode) {
    if (!rollup?.years) return { outlays: [], receipts: [], deficit: [] };
    // Cap years at 2024 for actual data, projections beyond that are for CBO projections page
    const years = Object.keys(rollup.years).map(Number).filter(year => year <= 2024).sort((a, b) => a - b);
    const outlaysData = years.map(year => ({
        x: year,
        y: selectTotals(rollup, macro, year, mode).outlays,
    }));
    const receiptsData = years.map(year => ({
        x: year,
        y: selectTotals(rollup, macro, year, mode).receipts,
    }));

    return [
        { id: 'Expenses', data: outlaysData },
        { id: 'Income', data: receiptsData },
    ];
}

export function selectOutlayComponentsSeries(rollup: BudgetRollup, macro: MacroSeries, mode: Mode) {
  if (!rollup?.years) return [
    { id: 'Mandatory', data: [] },
    { id: 'Discretionary', data: [] },
    { id: 'Net Interest', data: [] },
    { id: 'Deficit', data: [] }
  ];
  // Cap years at 2024 for actual data, projections beyond that are for CBO projections page
  const years = Object.keys(rollup.years).map(Number).filter(year => year <= 2024).sort((a, b) => a - b);
  
  const series = {
    mandatory: { id: 'Mandatory', data: [] as { x: number, y: number }[] },
    discretionary: { id: 'Discretionary', data: [] as { x: number, y: number }[] },
    netInterest: { id: 'Net Interest', data: [] as { x: number, y: number }[] },
    deficit: { id: 'Deficit', data: [] as { x: number, y: number }[] },
  };

  years.forEach(year => {
    const yearData = rollup.years[year];
    if (yearData) {
      series.mandatory.data.push({ x: year, y: transformValue(yearData.mandatory ?? 0, year, macro, mode) });
      series.discretionary.data.push({ x: year, y: transformValue(yearData.discretionary ?? 0, year, macro, mode) });
      series.netInterest.data.push({ x: year, y: transformValue(yearData.netInterest ?? 0, year, macro, mode) });
      series.deficit.data.push({ x: year, y: transformValue(yearData.deficit, year, macro, mode) });
    }
  });

  return [series.mandatory, series.discretionary, series.netInterest, series.deficit];
}