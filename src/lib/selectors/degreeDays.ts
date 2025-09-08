import { ClimateArtifact } from "@/types/climate";

interface DegreeDaysOptions {
  scope: 'city' | 'national' | 'state';
  id?: string;
  cadence: 'annual' | 'monthly';
}

export function selectDegreeDays(
  artifact: ClimateArtifact,
  options: DegreeDaysOptions
) {
  const { scope, id, cadence } = options;
  
  if (scope === 'city' && id) {
    const cityData = artifact.cities?.[id];
    if (!cityData) {
      console.warn(`No data found for city ${id}`);
      return { hdd: [], cdd: [] };
    }
    
    // Get temperature data
    const tempData = cityData.series?.[cadence]?.tempAnomaly || [];
    
    // Calculate degree days (simplified implementation)
    // In a real implementation, this would use actual heating/cooling degree day calculations
    const hdd: [number, number | null][] = tempData.map(([year, temp]) => {
      // Simplified HDD calculation - normally this would be based on a base temperature
      const hddValue = temp !== null ? Math.max(0, 65 - temp) : null;
      return [Number(year), hddValue];
    });
    
    const cdd: [number, number | null][] = tempData.map(([year, temp]) => {
      // Simplified CDD calculation - normally this would be based on a base temperature
      const cddValue = temp !== null ? Math.max(0, temp - 65) : null;
      return [Number(year), cddValue];
    });
    
    console.log(`Calculated ${hdd.filter(d => d[1] !== null).length} HDD and ${cdd.filter(d => d[1] !== null).length} CDD records for city ${id}`);
    
    return { hdd, cdd };
  }
  
  // Add support for national-level degree days data
  if (scope === 'national' || id === 'national') {
    const nationalData = artifact.national;
    if (!nationalData) {
      console.warn('No national data found');
      return { hdd: [], cdd: [] };
    }
    
    // Get actual degree days data from the national data
    const hddData = nationalData.series?.annual?.degreeDays?.hdd || [];
    const cddData = nationalData.series?.annual?.degreeDays?.cdd || [];
    
    // Check if we have data
    if (hddData.length === 0 && cddData.length === 0) {
      console.warn('No degree days data found in national data');
    } else {
      console.log(`Found ${hddData.length} HDD records and ${cddData.length} CDD records for national average`);
    }
    
    return { hdd: hddData, cdd: cddData };
  }
  
  // Add support for state-level degree days data
  if (scope === 'state' && id) {
    const stateData = (artifact.states as any)?.[id];
    if (!stateData) {
      console.warn(`No data found for state ${id}`);
      return { hdd: [], cdd: [] };
    }
    
    // Get actual degree days data from the state data
    const hddData = stateData.series?.annual?.degreeDays?.hdd || [];
    const cddData = stateData.series?.annual?.degreeDays?.cdd || [];
    
    // Log summary info instead of detailed data
    if (hddData.length === 0 && cddData.length === 0) {
      console.warn(`No degree days data found for state ${id}`);
    } else {
      console.log(`Found ${hddData.length} HDD records and ${cddData.length} CDD records for state ${id}`);
    }
    
    return { hdd: hddData, cdd: cddData };
  }
  
  // Return empty arrays for other cases
  return { hdd: [], cdd: [] };
}