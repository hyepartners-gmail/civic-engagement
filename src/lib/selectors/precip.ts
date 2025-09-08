import { ClimateArtifact } from "@/types/climate";
import { BasePeriod, Cadence } from "@/hooks/useClimateState";

type Series = [number, number | null][];

interface PrecipSelectorOptions {
  scope: 'city' | 'national';
  cityId?: string;
  basePeriod: BasePeriod;
  cadence: Cadence;
}

// Placeholder for re-baselining logic
const rebaseline = (series: Series, newBasePeriod: BasePeriod): Series => {
  return series;
};

export function selectPrecipAnomaly(
  artifact: ClimateArtifact,
  options: PrecipSelectorOptions
): Series {
  const { scope, cityId, basePeriod, cadence } = options;

  let series: [string | number, number | null][] = [];

  if (scope === 'city' && cityId) {
    series = artifact.cities?.[cityId]?.series?.[cadence]?.precipTotal ?? [];
  } else if (scope === 'national') {
    // For national data, we could aggregate city data or use a national series if available
    series = artifact.national?.series?.[cadence]?.precipTotal ?? [];
  }

  // Convert the series data to ensure year is always a number
  const convertedSeries: Series = series.map(([year, value]) => [Number(year), value]);

  if (basePeriod.replace('-', ' to ') !== artifact.meta.basePeriod) {
    return rebaseline(convertedSeries, basePeriod);
  }

  return convertedSeries;
}

// New function to select city precipitation data directly
export function selectCityPrecip(
  artifact: ClimateArtifact,
  options: { cityId: string }
): Series {
  const { cityId } = options;
  
  if (!artifact.cities?.[cityId]) {
    console.warn(`City precipitation data for ${cityId} not available in artifact`);
    return [];
  }
  
  // Convert the series data to ensure year is always a number
  const rawSeries: [string | number, number | null][] = artifact.cities[cityId].series?.annual?.precipTotal ?? [];
  return rawSeries.map(([year, value]) => [Number(year), value]);
}