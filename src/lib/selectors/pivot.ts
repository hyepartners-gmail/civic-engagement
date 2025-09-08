import { ClimateArtifact } from "@/types/climate";
import { Cadence, BasePeriod } from "@/hooks/useClimateState";
import { safeCoverage } from "@/utils/array";

type Series = [number, number | null][];

// Reducer functions
const reducers = {
  mean: (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  max: (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0,
  count_gte: (threshold: number) => (arr: number[]) => arr.filter(v => v >= threshold).length,
};

export function computePivot(
  series: Series,
  beforeRange: [number, number],
  afterRange: [number, number],
  reducer: (arr: number[]) => number
) {
  // Handle empty series
  if (!series || series.length === 0) {
    return { before: null, after: null, delta: null, pctChange: null };
  }
  
  const filterAndReduce = (range: [number, number]) => {
    try {
      const values = series
        .filter(([year, value]) => 
          year !== null && 
          !isNaN(Number(year)) && 
          year >= range[0] && 
          year <= range[1] && 
          value !== null && 
          value !== undefined && 
          !isNaN(Number(value))
        )
        .map(([, value]) => Number(value));
      
      return values.length > 0 ? reducer(values) : null;
    } catch (error) {
      console.error("Error filtering and reducing data:", error);
      return null;
    }
  };

  const beforeValue = filterAndReduce(beforeRange);
  const afterValue = filterAndReduce(afterRange);
  
  // Handle case where both values are null
  if (beforeValue === null && afterValue === null) {
    return { before: null, after: null, delta: null, pctChange: null };
  }
  
  const delta = (beforeValue !== null && afterValue !== null) ? afterValue - beforeValue : null;
  const pctChange = (delta !== null && beforeValue !== null && beforeValue !== 0) ? delta / beforeValue : null;

  return { before: beforeValue, after: afterValue, delta, pctChange };
}

// Enhanced metric selector for the pivot story
export function selectMetricSeries(
  artifact: ClimateArtifact,
  metricKey: string,
  scope: 'city' | 'state' | 'national',
  id: string
): Series {
  let rawSeries: [string | number, number | null][] | undefined;
  
  try {
    if (scope === 'city') {
      const cityData = artifact.cities?.[id]?.series;
      if (!cityData) return [];
      
      switch (metricKey) {
        case 'tempAnomaly':
          rawSeries = cityData?.annual?.tempAnomaly || [];
          break;
        case 'precipTotal':
          rawSeries = cityData?.annual?.precipTotal || [];
          break;
        case 'hotDays90F':
          rawSeries = cityData?.annual?.extremes?.hotDays90F || [];
          break;
        case 'warmNights70F':
          rawSeries = cityData?.annual?.extremes?.warmNights70F || [];
          break;
        case 'max5DayPrecip':
          rawSeries = cityData?.annual?.extremes?.max5DayPrecip || [];
          break;
        case 'coldDays32F':
          rawSeries = cityData?.annual?.extremes?.coldDays32F || [];
          break;
        case 'max1DayPrecip':
          rawSeries = cityData?.annual?.extremes?.max1DayPrecip || [];
          break;
        default:
          return [];
      }
    } else if (scope === 'state') {
      const stateData = (artifact.states as any)?.[id]?.series;
      if (!stateData) return [];
      
      switch (metricKey) {
        case 'tempAnomaly':
          rawSeries = stateData?.annual?.tempAnomaly || [];
          break;
        case 'precipTotal':
          rawSeries = stateData?.annual?.precipTotal || [];
          break;
        case 'hotDays90F':
          rawSeries = stateData?.annual?.extremes?.hotDays90F || [];
          break;
        case 'warmNights70F':
          rawSeries = stateData?.annual?.extremes?.warmNights70F || [];
          break;
        case 'max5DayPrecip':
          rawSeries = stateData?.annual?.extremes?.max5DayPrecip || [];
          break;
        case 'coldDays32F':
          rawSeries = stateData?.annual?.extremes?.coldDays32F || [];
          break;
        case 'max1DayPrecip':
          rawSeries = stateData?.annual?.extremes?.max1DayPrecip || [];
          break;
        case 'emissions.co2':
          rawSeries = stateData?.annual?.emissions?.co2 || [];
          break;
        case 'wildfire.acresBurned':
          rawSeries = stateData?.annual?.wildfire?.acresBurned || [];
          break;
        case 'wildfire.fires':
          rawSeries = stateData?.annual?.wildfire?.fires || [];
          break;
        default:
          // Return empty array for unknown metrics
          return [];
      }
    } else if (scope === 'national') {
      const nationalData = artifact.national?.series;
      if (!nationalData) return [];
      
      switch (metricKey) {
        case 'tempAnomaly':
          rawSeries = nationalData?.annual?.tempAnomaly || [];
          break;
        case 'precipTotal':
          rawSeries = nationalData?.annual?.precipTotal || [];
          break;
        case 'hotDays90F':
          rawSeries = nationalData?.annual?.extremes?.hotDays90F || [];
          break;
        case 'warmNights70F':
          rawSeries = nationalData?.annual?.extremes?.warmNights70F || [];
          break;
        case 'max5DayPrecip':
          rawSeries = nationalData?.annual?.extremes?.max5DayPrecip || [];
          break;
        case 'coldDays32F':
          rawSeries = nationalData?.annual?.extremes?.coldDays32F || [];
          break;
        case 'max1DayPrecip':
          rawSeries = nationalData?.annual?.extremes?.max1DayPrecip || [];
          break;
        case 'disasters.total':
          rawSeries = nationalData?.annual?.disasters?.total || [];
          break;
        case 'emissions.co2':
          rawSeries = nationalData?.annual?.emissions?.co2 || [];
          break;
        case 'wildfire.acresBurned':
          rawSeries = nationalData?.annual?.wildfire?.acresBurned || [];
          break;
        case 'wildfire.fires':
          rawSeries = nationalData?.annual?.wildfire?.fires || [];
          break;
        default:
          // Return empty array for unknown metrics
          return [];
      }
    }
  } catch (error) {
    console.error(`Error accessing metric ${metricKey} for ${scope} ${id}:`, error);
    return [];
  }

  // Ensure values are numbers or null (not undefined)
  return rawSeries ? rawSeries.map(([year, value]) => [Number(year), value === undefined ? null : value]) : [];
}

export { reducers };