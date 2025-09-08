import { ClimateArtifact } from "@/types/climate";

type Series = [number, number | null][];

interface SummerAnomalyOptions {
  scope: 'city' | 'state';
  id: string; // cityId or stateId
}

/**
 * Selector to get summer temperature anomaly data
 * @param artifact The climate data artifact
 * @param options Options containing scope and ID
 * @returns Array of [year, anomaly] pairs
 */
export function selectSummerAnomaly(
  artifact: ClimateArtifact,
  options: SummerAnomalyOptions
): Series {
  const { scope, id } = options;
  
  if (scope === 'city') {
    if (!artifact.cities?.[id]) {
      console.warn(`City data for ${id} not found in artifact`);
      return [];
    }
    
    const rawSeries = artifact.cities[id].series?.annual?.tempAnomaly ?? [];
    
    if (rawSeries.length === 0) {
      console.warn(`No summer temperature anomaly data found for city ${id}`);
    }
    
    // Convert to number year format
    return rawSeries.map(([year, value]) => [Number(year), value]);
  } else if (scope === 'state') {
    if (!artifact.states?.[id]) {
      console.warn(`State data for ${id} not found in artifact`);
      return [];
    }
    
    const rawSeries = artifact.states[id].series?.annual?.tempAnomaly ?? [];
    
    if (rawSeries.length === 0) {
      console.warn(`No summer temperature anomaly data found for state ${id}`);
    }
    
    // Convert to number year format
    return rawSeries.map(([year, value]) => [Number(year), value]);
  } else {
    console.warn(`Unsupported scope: ${scope}`);
    return [];
  }
}

interface SectorProxyOptions {
  metricKey: string; // 'construction', 'agriculture', 'energy'
  scope: 'city' | 'state';
  id: string; // cityId or stateId
}

/**
 * Selector to get sector productivity proxy data
 * @param artifact The climate data artifact
 * @param options Options containing metric key, scope, and ID
 * @returns Array of [year, proxy_value] pairs
 */
export function selectSectorProxy(
  artifact: ClimateArtifact,
  options: SectorProxyOptions
): Series {
  const { metricKey, scope, id } = options;
  
  // Validate metric key
  const validMetrics = ['construction', 'agriculture', 'energy'];
  if (!validMetrics.includes(metricKey)) {
    console.warn(`Invalid metric key: ${metricKey}`);
    return [];
  }
  
  if (scope === 'city') {
    if (!artifact.cities?.[id]) {
      console.warn(`City data for ${id} not found in artifact`);
      return [];
    }
    
    const economyData = artifact.cities[id].series?.annual?.economy;
    let rawSeries: [string | number, number | null][] = [];
    
    if (economyData) {
      switch (metricKey) {
        case 'construction':
          rawSeries = economyData.construction ?? [];
          break;
        case 'agriculture':
          rawSeries = economyData.agriculture ?? [];
          break;
        case 'energy':
          rawSeries = economyData.energy ?? [];
          break;
      }
    }
    
    if (rawSeries.length === 0) {
      console.warn(`No ${metricKey} proxy data found for city ${id}`);
    }
    
    // Convert to number year format
    return rawSeries.map(([year, value]) => [Number(year), value]);
  } else if (scope === 'state') {
    if (!artifact.states?.[id]) {
      console.warn(`State data for ${id} not found in artifact`);
      return [];
    }
    
    const economyData = artifact.states[id].series?.annual?.economy;
    let rawSeries: [string | number, number | null][] = [];
    
    if (economyData) {
      switch (metricKey) {
        case 'construction':
          rawSeries = economyData.construction ?? [];
          break;
        case 'agriculture':
          rawSeries = economyData.agriculture ?? [];
          break;
        case 'energy':
          rawSeries = economyData.energy ?? [];
          break;
      }
    }
    
    if (rawSeries.length === 0) {
      console.warn(`No ${metricKey} proxy data found for state ${id}`);
    }
    
    // Convert to number year format
    return rawSeries.map(([year, value]) => [Number(year), value]);
  } else {
    console.warn(`Unsupported scope: ${scope}`);
    return [];
  }
}

/**
 * Function to align two series by year, filtering out pairs where either value is null
 * @param series1 First series
 * @param series2 Second series
 * @returns Array of [year, value1, value2] triplets
 */
export function alignYears(series1: Series, series2: Series): [number, number, number][] {
  // Create maps for faster lookup
  const map1 = new Map(series1);
  const map2 = new Map(series2);
  
  // Get all years that exist in both series
  const years = new Set<number>();
  series1.forEach(([year]) => {
    if (map2.has(year)) {
      years.add(year);
    }
  });
  
  // Create aligned pairs, filtering out null values
  const result: [number, number, number][] = [];
  Array.from(years).sort((a, b) => a - b).forEach(year => {
    const value1 = map1.get(year);
    const value2 = map2.get(year);
    
    // Only include pairs where both values are non-null
    if (value1 !== null && value1 !== undefined && value2 !== null && value2 !== undefined) {
      result.push([year, value1, value2]);
    }
  });
  
  return result;
}

/**
 * Function to calculate linear regression slope and R²
 * @param points Array of [x, y] points
 * @returns Object with slope and R² values
 */
export function calculateLinearRegression(points: [number, number][]): { slope: number; r2: number } {
  if (points.length < 2) {
    return { slope: 0, r2: 0 };
  }
  
  // Calculate means
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  points.forEach(([x, y]) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  // Calculate slope
  const numerator = sumXY - n * meanX * meanY;
  const denominator = sumXX - n * meanX * meanX;
  
  if (denominator === 0) {
    return { slope: 0, r2: 0 };
  }
  
  const slope = numerator / denominator;
  
  // Calculate R²
  let totalSumSquares = 0;
  let residualSumSquares = 0;
  
  points.forEach(([x, y]) => {
    const predictedY = slope * (x - meanX) + meanY;
    totalSumSquares += (y - meanY) * (y - meanY);
    residualSumSquares += (y - predictedY) * (y - predictedY);
  });
  
  const r2 = 1 - (residualSumSquares / totalSumSquares);
  
  return { slope, r2 };
}