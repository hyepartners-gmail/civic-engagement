import { ClimateArtifact } from "@/types/climate";

type Series = [number, number | null][];

interface CityAnomalyOptions {
  cityId: string;
}

/**
 * Selector to get temperature anomaly data for a specific city
 * @param artifact The climate data artifact
 * @param options Options containing the city ID
 * @returns Array of [year, anomaly] pairs
 */
export function selectCityAnomaly(
  artifact: ClimateArtifact,
  options: CityAnomalyOptions
): Series {
  const { cityId } = options;
  
  if (!artifact.cities?.[cityId]) {
    console.warn(`City data for ${cityId} not found in artifact`);
    return [];
  }
  
  const rawSeries = artifact.cities[cityId].series?.annual?.tempAnomaly ?? [];
  
  if (rawSeries.length === 0) {
    console.warn(`No temperature anomaly data found for city ${cityId}`);
  }
  
  // Convert to number year format
  return rawSeries.map(([year, value]) => [Number(year), value]);
}

interface CityHotDaysOptions {
  cityId: string;
  threshold: number; // 90, 95, or 100
}

// Define the extremes data structure
interface ExtremesData {
  hotDays90F?: [string | number, number | null][];
  hotDays95F?: [string | number, number | null][];
  hotDays100F?: [string | number, number | null][];
  warmNights70F?: [string | number, number | null][];
  coldDays32F?: [string | number, number | null][];
  max1DayPrecip?: [string | number, number | null][];
  max5DayPrecip?: [string | number, number | null][];
}

// Define the annual data structure
interface AnnualData {
  tempAnomaly?: [string | number, number | null][];
  precipTotal?: [string | number, number | null][];
  extremes?: ExtremesData;
}

// Define the city series structure
interface CitySeries {
  annual?: AnnualData;
}

/**
 * Selector to get hot days data for a specific city and threshold
 * @param artifact The climate data artifact
 * @param options Options containing the city ID and temperature threshold
 * @returns Array of [year, count] pairs
 */
export function selectCityHotDays(
  artifact: ClimateArtifact,
  options: CityHotDaysOptions
): Series {
  const { cityId, threshold } = options;
  
  if (!artifact.cities?.[cityId]) {
    console.warn(`City data for ${cityId} not found in artifact`);
    return [];
  }
  
  let fieldName: keyof ExtremesData;
  switch (threshold) {
    case 90:
      fieldName = 'hotDays90F';
      break;
    case 95:
      fieldName = 'hotDays95F';
      break;
    case 100:
      fieldName = 'hotDays100F';
      break;
    default:
      console.warn(`Unsupported threshold: ${threshold}`);
      return [];
  }
  
  const citySeries = artifact.cities[cityId].series as CitySeries | undefined;
  const rawSeries = citySeries?.annual?.extremes?.[fieldName] ?? [];
  
  if (rawSeries.length === 0) {
    console.warn(`No hot days data (${fieldName}) found for city ${cityId}`);
  }
  
  // Convert to number year format
  return rawSeries.map(([year, value]) => [Number(year), value]);
}

/**
 * Compute synced domains for multiple city series when syncY is enabled
 * @param seriesByCity Object mapping city IDs to their data series
 * @returns [min, max] domain values that encompass all series
 */
export function computeSyncedDomains(seriesByCity: Record<string, Series>): [number, number] {
  let globalMin = Infinity;
  let globalMax = -Infinity;
  
  Object.values(seriesByCity).forEach(series => {
    series.forEach(([_, value]) => {
      if (value !== null) {
        globalMin = Math.min(globalMin, value);
        globalMax = Math.max(globalMax, value);
      }
    });
  });
  
  // Add some padding
  const range = globalMax - globalMin;
  const padding = range * 0.1;
  
  // Handle edge case where all values are the same
  if (range === 0) {
    return [globalMin - 1, globalMax + 1];
  }
  
  return [globalMin - padding, globalMax + padding];
}