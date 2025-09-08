import { ClimateArtifact } from "@/types/climate";

type Series = [number, number | null][];

interface PopulationSelectorOptions {
  stateId: string;
}

/**
 * Select state population data
 * @param artifact Climate data artifact
 * @param options Selection options with stateId
 * @returns Time series of population data for the specified state
 */
export function selectStatePopulation(
  artifact: ClimateArtifact,
  options: PopulationSelectorOptions
): Series {
  const { stateId } = options;
  
  const stateData = (artifact.states as any)?.[stateId];
  if (!stateData) {
    console.warn(`State population data for ${stateId} not available in artifact`);
    return [];
  }
  
  // Convert the series data to ensure year is always a number
  const rawSeries: [string | number, number | null][] = stateData.series?.annual?.population ?? [];
  return rawSeries.map(([year, count]) => [Number(year), count]);
}

/**
 * Select national population data
 * @param artifact Climate data artifact
 * @returns Time series of national population data
 */
export function selectNationalPopulation(
  artifact: ClimateArtifact
): Series {
  const nationalData = artifact.national;
  if (!nationalData) {
    console.warn(`National population data not available in artifact`);
    return [];
  }
  
  // Convert the series data to ensure year is always a number
  const rawSeries: [string | number, number | null][] = nationalData.series?.annual?.population ?? [];
  return rawSeries.map(([year, count]) => [Number(year), count]);
}