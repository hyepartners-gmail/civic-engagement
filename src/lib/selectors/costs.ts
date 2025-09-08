import { ClimateArtifact } from "@/types/climate";

type Series = [number, number | null][];

interface FemaCostsOptions {
  scope: 'national'; // For v1, only national scope
  types: string[]; // Array of disaster types to include
}

/**
 * Selector to get FEMA disaster costs data
 * @param artifact The climate data artifact
 * @param options Options containing scope and disaster types
 * @returns Object mapping disaster types to series data
 */
export function selectFemaCosts(
  artifact: ClimateArtifact,
  options: FemaCostsOptions
): Record<string, Series> {
  const { scope, types } = options;
  
  if (scope !== 'national') {
    console.warn('Only national scope is supported for FEMA costs in v1');
    return {};
  }
  
  if (!artifact.national) {
    console.warn('No national data found in artifact');
    return {};
  }
  
  const femaCosts = artifact.national.series?.annual?.femaCosts;
  
  if (!femaCosts) {
    console.warn('No FEMA costs data found in national data');
    return {};
  }
  
  const result: Record<string, Series> = {};
  
  types.forEach(type => {
    const rawSeries = femaCosts[type] ?? [];
    if (rawSeries.length === 0) {
      console.warn(`No FEMA costs data found for type: ${type}`);
    }
    // Convert to number year format
    result[type] = rawSeries.map(([year, value]: [string | number, number | null]) => [Number(year), value]);
  });
  
  return result;
}

/**
 * Selector to get inflation index data (CPI-U)
 * @returns Array of [year, cpi] pairs
 */
export function selectInflationIndex(): Series {
  // In a real implementation, this would fetch from the cpi.json file
  // For now, we'll return an empty array as a placeholder
  console.warn('Inflation index data not yet implemented');
  return [];
}

interface EmissionsNationalOptions {
  perCapita?: boolean;
}

/**
 * Selector to get national emissions data
 * @param artifact The climate data artifact
 * @param options Options containing perCapita flag
 * @returns Series of emissions data
 */
export function selectEmissionsNational(
  artifact: ClimateArtifact,
  options: EmissionsNationalOptions = {}
): Series {
  const { perCapita = false } = options;
  
  if (!artifact.national) {
    console.warn('No national data found in artifact');
    return [];
  }
  
  const emissionsSeries = artifact.national.series?.annual?.emissions?.co2 ?? [];
  
  if (emissionsSeries.length === 0) {
    console.warn('No national emissions data found');
  }
  
  let resultSeries: Series = emissionsSeries.map(([year, value]) => [Number(year), value]);
  
  if (perCapita) {
    const populationSeries = artifact.national.series?.annual?.population ?? [];
    if (populationSeries.length === 0) {
      console.warn('Per-capita emissions requested but no population data found');
      return [];
    }
    
    const popMap = new Map(populationSeries);
    resultSeries = resultSeries.map(([year, emissions]) => {
      if (year === null) return [0, null]; // Return a valid Series element
      const pop = popMap.get(year);
      if (emissions !== null && pop && pop > 0) {
        // Convert from million metric tons to tons per person
        return [year, (emissions * 1e6) / pop];
      }
      return [year, null];
    }) as Series;
  }
  
  return resultSeries;
}

/**
 * Helper function to adjust series for inflation
 * @param series The nominal dollar series to adjust
 * @param cpi The CPI series
 * @param baseYear The base year for real dollars (e.g., 2017 or 2020)
 * @returns Series adjusted to real dollars
 */
export function adjustForInflation(
  series: Series,
  cpi: Series,
  baseYear: number
): Series {
  // Create a map of CPI values by year
  const cpiMap = new Map(cpi);
  
  // Get the base year CPI value
  const baseCpi = cpiMap.get(baseYear);
  if (!baseCpi) {
    console.warn(`Base year CPI not found for year: ${baseYear}`);
    return series;
  }
  
  // Adjust each value in the series
  return series.map(([year, value]) => {
    if (value === null) return [year, null];
    
    const yearCpi = cpiMap.get(year);
    if (!yearCpi) {
      console.warn(`CPI not found for year: ${year}`);
      return [year, null];
    }
    
    // Real dollars = Nominal dollars * (Base CPI / Year CPI)
    const realValue = value * (baseCpi / yearCpi);
    return [year, realValue];
  });
}