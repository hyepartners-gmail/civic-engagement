import { CityTempData, CityPrecipData, DisasterData, WildfireData } from "@/hooks/useClimateData";

type Series = [number, number | null][];

// City mapping from full names to IDs
const CITY_MAPPING: Record<string, string> = {
  "Seattle": "seattle",
  "Los Angeles": "los-angeles",
  "Chicago": "chicago",
  "Houston": "houston",
  "Atlanta": "atlanta",
  "New York City": "new-york"
};

/**
 * Calculate temperature anomalies for a specific city relative to a base period
 */
export function selectCityTempAnomaly(
  cityTemps: CityTempData[],
  options: { 
    cityId: string; 
    basePeriod: [number, number]; // [startYear, endYear]
    cadence?: 'annual' | 'fiscal';
  }
): Series {
  const { cityId, basePeriod, cadence = 'annual' } = options;
  
  // Find the full city name for the given cityId
  const cityName = Object.keys(CITY_MAPPING).find(name => CITY_MAPPING[name] === cityId);
  if (!cityName) {
    return [];
  }
  
  // Filter data for the specific city
  const cityData = cityTemps.filter(item => item.city === cityName);
  
  if (cityData.length === 0) {
    return [];
  }
  
  // Convert to year -> temperature map
  const yearTempMap = new Map<number, number>();
  cityData.forEach(item => {
    yearTempMap.set(item.year, item.avg_temp_c);
  });
  
  // Calculate base period mean
  const [baseStart, baseEnd] = basePeriod;
  const basePeriodTemps: number[] = [];
  
  for (let year = baseStart; year <= baseEnd; year++) {
    if (yearTempMap.has(year)) {
      basePeriodTemps.push(yearTempMap.get(year)!);
    }
  }
  
  if (basePeriodTemps.length === 0) {
    return [];
  }
  
  const baseMean = basePeriodTemps.reduce((sum, temp) => sum + temp, 0) / basePeriodTemps.length;
  
  // Calculate anomalies
  const anomalies: Series = [];
  cityData.forEach(item => {
    const anomaly = item.avg_temp_c - baseMean;
    anomalies.push([item.year, Number(anomaly.toFixed(2))]);
  });
  
  // Sort by year
  anomalies.sort((a, b) => a[0] - b[0]);
  
  return anomalies;
}

/**
 * Select national temperature anomaly data (placeholder implementation)
 * In a real implementation, this would come from national temperature data
 */
export function selectNationalTempAnomaly(
  cityTemps: CityTempData[],
  options: { cadence: 'annual' | 'fiscal' }
): Series {
  // For now, we'll use the average of all cities as a placeholder for national data
  const { cadence } = options;
  
  // Get unique years
  const years = Array.from(new Set(cityTemps.map(item => item.year))).sort();
  
  // Calculate average temperature for each year across all cities
  const avgTemps: Series = [];
  
  years.forEach(year => {
    const yearData = cityTemps.filter(item => item.year === year);
    if (yearData.length > 0) {
      const avgTemp = yearData.reduce((sum, item) => sum + item.avg_temp_c, 0) / yearData.length;
      avgTemps.push([year, Number(avgTemp.toFixed(2))]);
    }
  });
  
  // Calculate base period mean (using 1991-2020 as default)
  const basePeriodTemps = avgTemps
    .filter(([year, temp]) => year >= 1991 && year <= 2020 && temp !== null)
    .map(([year, temp]) => temp) as number[];
  
  if (basePeriodTemps.length === 0) {
    return [];
  }
  
  const baseMean = basePeriodTemps.reduce((sum, temp) => sum + temp, 0) / basePeriodTemps.length;
  
  // Calculate anomalies
  const anomalies: Series = avgTemps.map(([year, temp]) => {
    if (temp === null) return [year, null];
    const anomaly = temp - baseMean;
    return [year, Number(anomaly.toFixed(2))];
  });
  
  return anomalies;
}

/**
 * Select precipitation data for a specific city
 */
export function selectCityPrecip(
  cityPrecip: CityPrecipData[],
  options: { 
    cityId: string;
  }
): Series {
  const { cityId } = options;
  
  // Find the full city name for the given cityId
  const cityName = Object.keys(CITY_MAPPING).find(name => CITY_MAPPING[name] === cityId);
  if (!cityName) {
    return [];
  }
  
  // Filter data for the specific city
  const cityData = cityPrecip.filter(item => item.city === cityName);
  
  if (cityData.length === 0) {
    return [];
  }
  
  // Convert to series format
  const series: Series = cityData.map(item => [item.year, item.precip_mm]);
  
  // Sort by year
  series.sort((a, b) => a[0] - b[0]);
  
  return series;
}

/**
 * Select precipitation data for a specific state
 * For now, we're using city data as a proxy since we don't have actual state-level data
 */
export function selectStatePrecip(
  cityPrecip: CityPrecipData[],
  options: { 
    stateId: string;
  }
): Series {
  const { stateId } = options;
  
  // Map state ID to corresponding city ID
  const cityMapping: Record<string, string> = {
    'wa': 'seattle',
    'ca': 'los-angeles',
    'il': 'chicago',
    'tx': 'houston',
    'ga': 'atlanta',
    'ny': 'new-york'
  };
  
  const cityId = cityMapping[stateId] || 'seattle';
  
  // Use city precipitation as a proxy for state
  return selectCityPrecip(cityPrecip, { cityId });
}

/**
 * Select disaster data
 */
export function selectDisasterCounts(
  disasters: DisasterData[]
): Series {
  // Convert to series format
  const series: Series = disasters.map(item => [item.year, item.total]);
  
  // Sort by year
  series.sort((a, b) => a[0] - b[0]);
  
  return series;
}

/**
 * Select wildfire data
 */
export function selectWildfireData(
  wildfires: WildfireData[],
  type: 'acres' | 'fires' = 'acres'
): Series {
  // Convert to series format
  const series: Series = wildfires.map(item => [
    item.year, 
    type === 'acres' ? item.acres_burned : item.fires
  ]);
  
  // Sort by year
  series.sort((a, b) => a[0] - b[0]);
  
  return series;
}