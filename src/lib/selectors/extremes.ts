import { ClimateArtifact } from "@/types/climate";
import { Cadence } from "@/hooks/useClimateState";
import { safeCoverage } from "@/utils/array";

type Series = [number, number | null][];

interface ExtremesSelectorOptions {
  scope: 'city' | 'national';
  id?: string;
  cadence?: Cadence;
}

export function selectCityHotDays(
  artifact: ClimateArtifact,
  options: { cityId: string; threshold: number }
): Series {
  const { cityId, threshold } = options;
  const cityData = artifact.cities[cityId]?.series;

  // NOTE: The current artifact only contains pre-computed data for 90°F.
  // This selector is structured to handle other thresholds if the data artifact is updated in the future.
  if (threshold === 90) {
    const series = cityData?.annual?.extremes?.hotDays90F ?? [];
    return series.map(([year, value]) => [Number(year), value]);
  }
  
  // Return empty array for other thresholds as data is not available.
  return [];
}

export function selectWarmNights(
  artifact: ClimateArtifact,
  options: { cityId: string; threshold: number }
): Series {
  const { cityId, threshold } = options;
  const cityData = artifact.cities[cityId]?.series;
  
  // Note: The current artifact has pre-computed values for 70F.
  // A real implementation would use daily data to compute for any threshold.
  // We'll return the 70F data as a placeholder for any requested threshold.
  if (threshold === 70) {
    const series = cityData?.annual?.extremes?.warmNights70F ?? [];
    return series.map(([year, value]) => [Number(year), value]);
  }
  
  // For other thresholds, we would need to compute from daily data
  // This is a placeholder implementation
  return [];
}

export function selectWildfireAcres(
  artifact: ClimateArtifact,
  options: { scope: 'state' | 'national', id?: string }
): { series: Series; hasData: boolean } {
  const { scope, id } = options;
  let series: [string | number, number | null][] = [];
  
  if (scope === 'national') {
    series = artifact.national?.series?.annual?.wildfire?.acresBurned ?? [];
  } else if (scope === 'state' && id) {
    // Check if state data exists
    const stateData = (artifact.states as any)?.[id]?.series;
    series = stateData?.annual?.wildfire?.acresBurned ?? [];
  }
  
  const resultSeries: Series = series.map(([year, value]) => [Number(year), value]);
  const hasData = resultSeries.length > 0 && safeCoverage(resultSeries, 0.1); // Any data is better than none for wildfires
  
  return { series: resultSeries, hasData };
}

export function selectFemaHeatCounts(
  artifact: ClimateArtifact,
  options: { stateId: string }
): Series {
  const { stateId } = options;
  
  // Check if FEMA heat data exists for the state
  const stateData = (artifact.states as any)?.[stateId]?.series;
  const series: [string | number, number | null][] = stateData?.annual?.disasters?.heat ?? [];
  
  return series.map(([year, value]) => [Number(year), value]);
}

// Function to align multiple series by year, retaining gaps
export function alignYears(seriesArray: Series[]): [number, ...(number | null)[]][] {
  const map = new Map<number, (number | null)[]>();

  seriesArray.forEach((series, seriesIndex) => {
    series.forEach(([year, value]) => {
      if (!map.has(year)) {
        map.set(year, Array(seriesArray.length).fill(null));
      }
      map.get(year)![seriesIndex] = value;
    });
  });

  return Array.from(map.entries())
    .map(([year, values]): [number, ...(number | null)[]] => [year, ...values])
    .sort((a, b) => a[0] - b[0]);
}

// Function to calculate percentile of a value in a series
export function calculatePercentile(series: Series, value: number): number {
  // Extract non-null values
  const values = series
    .map(([, val]) => val)
    .filter((val): val is number => val !== null)
    .sort((a, b) => a - b);
  
  if (values.length === 0) return 0;
  
  // Find the position of the value
  const position = values.filter(v => v < value).length;
  return (position / values.length) * 100;
}

// Function to check if a value is in the 90th percentile or higher
export function isHighPercentile(series: Series, value: number | null): boolean {
  if (value === null) return false;
  const percentile = calculatePercentile(series, value);
  return percentile >= 90;
}