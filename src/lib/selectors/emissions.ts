import { ClimateArtifact } from "@/types/climate";
import { calculateRollingAverage } from "../time/rolling";

type Series = [number, number | null][];

interface CO2SelectorOptions {
  stateId: string;
  perCapita: boolean;
  smoothing: boolean;
  rollingWindow?: number;
}

export function selectStateCO2(
  artifact: ClimateArtifact,
  options: CO2SelectorOptions
): Series {
  const { stateId, perCapita, smoothing, rollingWindow = 10 } = options;
  console.log(`Selecting CO2 data for state ${stateId}`, { perCapita, smoothing });
  const stateData = (artifact.states as any)?.[stateId];
  console.log(`State data for ${stateId}:`, stateData);
  if (!stateData) {
    console.warn(`No state data found for ${stateId}`);
    return [];
  }

  const rawSeries: [string | number, number | null][] = stateData.series?.annual?.emissions?.co2 ?? [];
  console.log(`Raw CO2 series for ${stateId}:`, rawSeries);
  let co2Series: Series = rawSeries.map(([year, value]) => [Number(year), value]);
  
  if (perCapita) {
    const rawPopulationSeries: [string | number, number | null][] = stateData.series?.annual?.population ?? [];
    const populationSeries: Series = rawPopulationSeries.map(([year, value]) => [Number(year), value]);
    if (populationSeries.length === 0) {
      console.warn(`Per-capita CO2 requested for ${stateId}, but no population data found.`);
    } else {
      const popMap = new Map(populationSeries);
      co2Series = co2Series.map(([year, co2]) => {
        const pop = popMap.get(year);
        if (co2 !== null && pop && pop > 0) {
          return [year, (co2 * 1e6) / pop]; // CO2 in million metric tons -> tons
        }
        return [year, null];
      });
    }
  }

  if (smoothing) {
    return calculateRollingAverage(co2Series, rollingWindow);
  }

  console.log(`Final CO2 series for ${stateId}:`, co2Series);
  return co2Series;
}

interface NationalCO2Options {
  perCapita: boolean;
  smoothing: boolean;
  rollingWindow?: number;
}

export function selectNationalCO2(
  artifact: ClimateArtifact,
  options: NationalCO2Options
): Series {
  const { perCapita, smoothing, rollingWindow = 10 } = options;
  console.log('Selecting national CO2 data', { perCapita, smoothing });
  const nationalData = artifact.national;
  if (!nationalData) {
    console.warn('No national data found');
    return [];
  }

  const rawSeries: [string | number, number | null][] = nationalData.series?.annual?.emissions?.co2 ?? [];
  console.log('Raw national CO2 series:', rawSeries);
  let co2Series: Series = rawSeries.map(([year, value]) => [Number(year), value]);
  
  // Log if we're missing data
  if (co2Series.length === 0) {
    console.warn('No national CO2 data found in artifact');
  }
  
  if (perCapita) {
    const rawPopulationSeries: [string | number, number | null][] = nationalData.series?.annual?.population ?? [];
    const populationSeries: Series = rawPopulationSeries.map(([year, value]) => [Number(year), value]);
    if (populationSeries.length === 0) {
      console.warn(`Per-capita CO2 requested for national, but no population data found.`);
    } else {
      const popMap = new Map(populationSeries);
      co2Series = co2Series.map(([year, co2]) => {
        const pop = popMap.get(year);
        if (co2 !== null && pop && pop > 0) {
          return [year, (co2 * 1e6) / pop]; // CO2 in million metric tons -> tons per person
        }
        return [year, null];
      });
    }
  }

  if (smoothing) {
    return calculateRollingAverage(co2Series, rollingWindow);
  }

  console.log('Final national CO2 series:', co2Series);
  return co2Series;
}

// Function to select temperature anomaly data based on source
interface TempAnomalyOptions {
  source: 'global' | 'national' | 'us';
  smoothing: boolean;
  rollingWindow?: number;
}

export function selectTempAnomaly(
  artifact: ClimateArtifact,
  options: TempAnomalyOptions
): Series {
  const { source, smoothing, rollingWindow = 10 } = options;
  
  let rawSeries: [string | number, number | null][] = [];
  let series: Series = [];
  
  if (source === 'global') {
    // For now, we'll use national data as a placeholder for global
    // In a real implementation, this would come from a separate global dataset
    rawSeries = artifact.national?.series?.annual?.tempAnomaly ?? [];
  } else if (source === 'national' || source === 'us') {
    rawSeries = artifact.national?.series?.annual?.tempAnomaly ?? [];
  }
  
  series = rawSeries.map(([year, value]) => [Number(year), value]);
  
  // Log if we're missing data
  if (series.length === 0) {
    console.warn(`No temperature anomaly data found for source: ${source}`);
  }
  
  const resultSeries: Series = series.map(([year, value]) => [Number(year), value]);
  
  if (smoothing) {
    const smoothedSeries: Series = calculateRollingAverage(resultSeries, rollingWindow);
    return smoothedSeries;
  }
  
  return resultSeries;
}

// Function to get milestone data
export interface Milestone {
  year: number;
  event: string;
  category: 'policy' | 'economic' | 'health' | 'environmental';
}

export function selectMilestones(): Milestone[] {
  // These are the milestones mentioned in the PRD
  return [
    { year: 1970, event: "Clean Air Act", category: "policy" },
    { year: 2008, event: "Great Recession", category: "economic" },
    { year: 2020, event: "COVID-19 Pandemic", category: "health" }
  ];
}