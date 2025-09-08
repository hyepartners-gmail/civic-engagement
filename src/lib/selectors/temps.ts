import { ClimateArtifact } from "@/types/climate";

type Series = [number, number | null][];

interface TempAnomalyOptions {
  scope: 'city' | 'national' | 'global';
  cityId?: string;
  basePeriod?: string;
  cadence: 'annual' | 'fiscal';
}

/**
 * Select temperature anomaly data for the specified scope and cadence
 * @param artifact The climate data artifact
 * @param options Options for selecting the data
 * @returns Series of [year, anomaly] pairs
 */
export function selectTempAnomaly(
  artifact: ClimateArtifact,
  options: TempAnomalyOptions
): Series {
  const { scope, cityId, cadence } = options;

  let rawSeries: [string | number, number | null][] = [];

  if (scope === 'city' && cityId) {
    rawSeries = artifact.cities[cityId]?.series?.[cadence]?.tempAnomaly ?? [];
  } else if (scope === 'national') {
    rawSeries = artifact.national?.series?.[cadence]?.tempAnomaly ?? [];
  } else if (scope === 'global') {
    // For now, global is the same as national (placeholder)
    rawSeries = artifact.national?.series?.[cadence]?.tempAnomaly ?? [];
  }
  
  // Ensure years are numbers and sort by year
  const resultSeries: Series = rawSeries
    .map(([year, value]): [number, number | null] => [Number(year), value])
    .sort((a, b) => a[0] - b[0]);
  
  return resultSeries;
}

/**
 * Select temperature anomaly data for a specific city
 * @param artifact The climate data artifact
 * @param options Options for selecting the data
 * @returns Series of [year, anomaly] pairs
 */
export function selectCityTempAnomaly(
  artifact: ClimateArtifact,
  options: { cityId: string; cadence: 'annual' | 'fiscal' }
): Series {
  const { cityId, cadence } = options;
  
  return selectTempAnomaly(artifact, {
    scope: 'city',
    cityId,
    cadence,
  });
}

/**
 * Select national temperature anomaly data
 * @param artifact The climate data artifact
 * @param options Options for selecting the data
 * @returns Series of [year, anomaly] pairs
 */
export function selectNationalTempAnomaly(
  artifact: ClimateArtifact,
  options: { cadence: 'annual' | 'fiscal' }
): Series {
  const { cadence } = options;
  
  return selectTempAnomaly(artifact, {
    scope: 'national',
    cadence,
  });
}

/**
 * Select global temperature anomaly data
 * @param artifact The climate data artifact
 * @param options Options for selecting the data
 * @returns Series of [year, anomaly] pairs
 */
export function selectGlobalTempAnomaly(
  artifact: ClimateArtifact,
  options: { cadence: 'annual' | 'fiscal' }
): Series {
  const { cadence } = options;
  
  return selectTempAnomaly(artifact, {
    scope: 'global',
    cadence,
  });
}

/**
 * Get temperature anomaly data for all cities
 * @param artifact The climate data artifact
 * @param options Options for selecting the data
 * @returns Object mapping city IDs to temperature anomaly series
 */
export function selectAllCitiesTempAnomaly(
  artifact: ClimateArtifact,
  options: { cadence: 'annual' | 'fiscal' }
): Record<string, Series> {
  const { cadence } = options;
  const result: Record<string, Series> = {};
  
  // Get the city IDs from the artifact
  const cityIds = Object.keys(artifact.cities || {});
  
  // Get the temperature anomaly data for each city
  cityIds.forEach((cityId) => {
    result[cityId] = selectCityTempAnomaly(artifact, { cityId, cadence });
  });
  
  return result;
}