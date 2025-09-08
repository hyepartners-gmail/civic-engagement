import { CityTempData } from "@/hooks/useClimateData";

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
export function selectCityTempAnomalyFromRaw(
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
 * Create placeholder hot days data based on temperature anomalies
 * In a real implementation, this would come from daily temperature data
 */
export function selectCityHotDaysFromRaw(
  cityTemps: CityTempData[],
  options: { 
    cityId: string; 
    threshold: number; // 90, 95, or 100
  }
): Series {
  const { cityId, threshold } = options;
  
  // Get temperature anomalies first
  const anomalies = selectCityTempAnomalyFromRaw(cityTemps, {
    cityId,
    basePeriod: [1991, 2020]
  });
  
  if (anomalies.length === 0) {
    return [];
  }
  
  // Base hot days count varies by city (approximate values)
  const baseHotDays = {
    'seattle': 2,
    'los-angeles': 25,
    'chicago': 8,
    'houston': 35,
    'atlanta': 20,
    'new-york': 10
  }[cityId] || 10;
  
  // Generate hot days data based on temperature anomalies
  // This is just a placeholder - in a real implementation, this would come from daily data
  const hotDays: Series = [];
  
  for (const [year, anomaly] of anomalies) {
    if (anomaly === null) {
      hotDays.push([year, null]);
      continue;
    }
    
    // Adjust based on anomaly (rough approximation)
    // Increase hot days by roughly 2 days per degree of warming
    let adjustedHotDays = Math.max(0, Math.round(baseHotDays + (anomaly * 2)));
    
    // Apply threshold factor (higher thresholds should have fewer days)
    if (threshold === 95) {
      adjustedHotDays = Math.max(0, Math.round(adjustedHotDays * 0.6));
    } else if (threshold === 100) {
      adjustedHotDays = Math.max(0, Math.round(adjustedHotDays * 0.3));
    }
    
    hotDays.push([year, adjustedHotDays]);
  }
  
  return hotDays;
}