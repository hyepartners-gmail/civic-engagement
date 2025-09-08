import { EmploymentArtifact, Recession } from "@/types/employment";
import { median } from 'd3-array';

/**
 * Calculates the share of each sector relative to the total for each time point.
 */
export function calcSectorShares(seriesData: (number | null)[][]): (number | null)[][] {
  if (!Array.isArray(seriesData) || seriesData.length === 0) return [];
  const numTimePoints = seriesData[0].length;
  const shares: (number | null)[][] = Array.from({ length: seriesData.length }, () => []);

  for (let i = 0; i < numTimePoints; i++) {
    let total = 0;
    for (let j = 0; j < seriesData.length; j++) {
      total += seriesData[j][i] || 0;
    }

    for (let j = 0; j < seriesData.length; j++) {
      const value = seriesData[j][i];
      if (total > 0 && value !== null) {
        shares[j][i] = value / total;
      } else {
        shares[j][i] = 0;
      }
    }
  }
  return shares;
}

/**
 * Rolls up monthly series data to fiscal year averages.
 */
export function rollupFYMean(series: (number | null)[], artifact: EmploymentArtifact): (number | null)[] {
  if (!Array.isArray(series)) return [];
  const fyData: { [key: number]: { sum: number; count: number } } = {};

  artifact.index.forEach((row, i) => {
    if (row.period_type === 'month') {
      const value = series[i];
      if (value !== null) {
        if (!fyData[row.fy]) {
          fyData[row.fy] = { sum: 0, count: 0 };
        }
        fyData[row.fy].sum += value;
        fyData[row.fy].count++;
      }
    }
  });

  const fyAverages: { [key: number]: number } = {};
  for (const fy in fyData) {
    fyAverages[fy] = fyData[fy].sum / fyData[fy].count;
  }

  return artifact.index.map(row => (row.period_type === 'fiscal_year' ? fyAverages[row.fy] : null));
}

/**
 * Calculates the month-over-month change for a series.
 */
export function diffMonthly(series: (number | null)[]): (number | null)[] {
  if (!Array.isArray(series)) {
    return [];
  }
  return series.map((val, i) => {
    if (i === 0 || val === null || series[i - 1] === null) {
      return null;
    }
    return val - (series[i - 1] as number);
  });
}

/**
 * Rolls up monthly series data to fiscal year sums.
 */
export function rollupFYSum(series: (number | null)[], artifact: EmploymentArtifact): Map<number, number> {
  const fyData = new Map<number, number>();
  if (!Array.isArray(series)) return fyData;

  artifact.index.forEach((row, i) => {
    if (row.period_type === 'month') {
      const value = series[i];
      if (value !== null) {
        fyData.set(row.fy, (fyData.get(row.fy) || 0) + value);
      }
    }
  });

  return fyData;
}

/**
 * Detects outliers where job growth and GDP growth diverge.
 */
export function detectOutliers(data: { fy: number; jobs: number; gdpGrowth?: number }[]): number[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(d => {
      if (d.gdpGrowth === undefined) return false;
      // Outlier if jobs grew during a recession (GDP < 0)
      if (d.jobs > 0 && d.gdpGrowth < 0) return true;
      // Outlier if jobs fell significantly during strong growth (GDP > 2.5%)
      if (d.jobs < -0.5 && d.gdpGrowth > 2.5) return true;
      return false;
    })
    .map(d => d.fy);
}

/**
 * Aligns multiple monthly series by date, creating tuples of values.
 */
export function alignMonthly(artifact: EmploymentArtifact, seriesKeys: string[]): { date: string; fy: number; values: (number | null)[] }[] {
  if (!artifact || !artifact.index) return [];
  return artifact.index
    .filter(row => row.period_type === 'month')
    .map((row, i) => {
      const values = seriesKeys.map(key => artifact.series[key]?.[i] ?? null);
      return { date: row.date, fy: row.fy, values };
    })
    .filter(d => d.values.some(v => v !== null)); // Keep rows with at least one non-null value
}

/**
 * Aggregates aligned monthly data into fiscal year averages.
 */
export function toFYPoints(alignedData: { fy: number; values: (number | null)[] }[]): { fy: number; values: (number | null)[] }[] {
  if (!Array.isArray(alignedData)) return [];
  const fyData = new Map<number, { sums: number[]; counts: number[] }>();

  alignedData.forEach(d => {
    if (!fyData.has(d.fy)) {
      fyData.set(d.fy, { sums: Array(d.values.length).fill(0), counts: Array(d.values.length).fill(0) });
    }
    const entry = fyData.get(d.fy)!;
    d.values.forEach((val, i) => {
      if (val !== null) {
        entry.sums[i] += val;
        entry.counts[i]++;
      }
    });
  });

  return Array.from(fyData.entries())
    .map(([fy, { sums, counts }]) => ({
      fy,
      values: sums.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : null)),
    }))
    .sort((a, b) => a.fy - b.fy);
}

/**
 * Finds anomalies in the Beveridge curve data (e.g., post-COVID shift).
 */
export function findBeveridgeAnomalies(fyPoints: { fy: number; ur: number; openings: number }[]): number[] {
  if (!Array.isArray(fyPoints)) return [];
  // Rule-of-thumb: flag years after 2020 where openings rate is high
  return fyPoints
    .filter(p => p.fy > 2020 && p.openings > 5.0)
    .map(p => p.fy);
}

/**
 * Calculates the year-over-year percentage change for a monthly series.
 */
export function wageGrowthYoY(series: (number | null)[]): (number | null)[] {
  if (!Array.isArray(series)) return [];
  return series.map((val, i) => {
    if (i < 12 || val === null || series[i - 12] === null || series[i - 12] === 0) {
      return null;
    }
    return (val / (series[i - 12] as number)) - 1;
  });
}

/**
 * Standardizes a series to z-scores.
 */
export function standardize(series: (number | null)[]): (number | null)[] {
  if (!Array.isArray(series)) return [];
  const values = series.filter((v): v is number => v !== null);
  if (values.length < 2) return series;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);

  if (stdDev === 0) return series.map(() => 0);

  return series.map(v => (v !== null ? (v - mean) / stdDev : null));
}

/**
 * Finds periods where one series (e.g., quits) surges ahead of another (e.g., wages).
 */
export function findSurgeWindows(
  seriesA: (number | null)[],
  seriesB: (number | null)[],
  threshold: number = 0.5
): { start: number; end: number }[] {
  if (!Array.isArray(seriesA) || !Array.isArray(seriesB)) return [];
  const zA = standardize(seriesA);
  const zB = standardize(seriesB);
  const windows: { start: number; end: number }[] = [];
  let inWindow = false;

  for (let i = 0; i < zA.length; i++) {
    const valA = zA[i];
    const valB = zB[i];

    if (valA !== null && valB !== null && valA > threshold && valA > valB) {
      if (!inWindow) {
        windows.push({ start: i, end: i });
        inWindow = true;
      } else {
        windows[windows.length - 1].end = i;
      }
    } else {
      inWindow = false;
    }
  }
  return windows;
}

export function findPeakTroughRecovery(
  totalEmployment: (number | null)[],
  index: { date: string }[],
  recessions: Recession[]
): { recStart: string; peakMonth: string; peakValue: number; troughMonth: string; troughValue: number; recoveryMonth: string | null; monthsToRecover: number | null }[] {
  if (!Array.isArray(totalEmployment) || totalEmployment.length === 0 || !Array.isArray(recessions) || recessions.length === 0) return [];

  const employmentWithDate = index.map((idx, i) => ({ date: idx.date, value: totalEmployment[i] }));

  return recessions.map(rec => {
    const recStartIndex = index.findIndex(idx => idx.date.startsWith(rec.start.substring(0, 7)));
    if (recStartIndex === -1) return null;

    const peakWindow = employmentWithDate.slice(Math.max(0, recStartIndex - 12), recStartIndex + 1);
    const peak = peakWindow.reduce((p, c) => (c.value ?? -Infinity) > (p.value ?? -Infinity) ? c : p, { date: '', value: -Infinity });
    if (peak.value === -Infinity) return null;

    const peakIndex = employmentWithDate.findIndex(d => d.date === peak.date);

    const recEndIndex = index.findIndex(idx => idx.date.startsWith(rec.end.substring(0, 7))) ?? employmentWithDate.length - 1;
    const troughWindow = employmentWithDate.slice(peakIndex, recEndIndex + 12);
    const trough = troughWindow.reduce((p, c) => (c.value ?? Infinity) < (p.value ?? Infinity) ? c : p, { date: '', value: Infinity });
    if (trough.value === Infinity) return null;

    const troughIndex = employmentWithDate.findIndex(d => d.date === trough.date);

    let recoveryMonth: string | null = null;
    if (peak.value !== null) {
      for (let i = troughIndex; i < employmentWithDate.length; i++) {
        if ((employmentWithDate[i].value ?? 0) >= peak.value) {
          recoveryMonth = employmentWithDate[i].date;
          break;
        }
      }
    }

    const monthsToRecover = recoveryMonth ? 
      (new Date(recoveryMonth).getFullYear() - new Date(trough.date).getFullYear()) * 12 + (new Date(recoveryMonth).getMonth() - new Date(trough.date).getMonth())
      : null;

    return {
      recStart: rec.start,
      peakMonth: peak.date,
      peakValue: peak.value,
      troughMonth: trough.date,
      troughValue: trough.value,
      recoveryMonth,
      monthsToRecover,
    };
  }).filter(Boolean) as any;
}

export function medianRecovery(recoveries: { monthsToRecover: number | null }[]): number | null {
  if (!Array.isArray(recoveries)) return null;
  const validMonths = recoveries.map(r => r.monthsToRecover).filter((m): m is number => m !== null);
  return median(validMonths) ?? null;
}

export function deflate(
  nominalSeries: (number | null)[],
  cpiSeries: (number | null)[]
): (number | null)[] {
  if (!Array.isArray(nominalSeries) || nominalSeries.length === 0 || !Array.isArray(cpiSeries) || cpiSeries.length === 0) return [];
  const baseCpi = cpiSeries[cpiSeries.length - 1] ?? 1;

  return nominalSeries.map((nominal, i) => {
    const cpi = cpiSeries[i];
    if (nominal === null || cpi === null || cpi === 0) return null;
    return (nominal / cpi) * baseCpi;
  });
}

// --- Stubs for Geography of Opportunity ---

export function selectLAUSUnemp(artifact: EmploymentArtifact, state: string): (number | null)[] {
  // STUB: Requires state-level LAUS data in artifact, e.g., artifact.series[`laus_unemp_${state}`]
  console.warn(`Data for LAUS Unemployment in ${state} is not available in the current artifact.`);
  return [];
}

export function selectQCEWWage(artifact: EmploymentArtifact, state: string): (number | null)[] {
  // STUB: Requires state-level QCEW data in artifact, e.g., artifact.series[`qcew_avg_wage_${state}`]
  console.warn(`Data for QCEW Average Wage in ${state} is not available in the current artifact.`);
  return [];
}

export function selectSectorShare(artifact: EmploymentArtifact, state: string, naics2: string): (number | null)[] {
  // STUB: Requires state-level sector employment data, e.g., artifact.series[`qcew_empl_${state}_${naics2}`]
  console.warn(`Data for Sector Share in ${state} (NAICS ${naics2}) is not available.`);
  return [];
}