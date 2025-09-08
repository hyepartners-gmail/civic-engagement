import { useQueries } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { perf } from '@/lib/perf';
import { ClimateArtifact } from '@/types/climate';

// Define types for our raw data
export interface CityTempData {
  city: string;
  year: number;
  avg_temp_c: number;
}

export interface CityPrecipData {
  city: string;
  year: number;
  precip_mm: number;
}

export interface DisasterData {
  year: number;
  hurricanes: number;
  wildfires: number;
  total: number;
}

export interface WildfireData {
  year: number;
  acres_burned?: number;
  acres?: number;
  fires: number;
  acres_million?: number;
}

// New interface for CO2 data
export interface CO2Data {
  state: string;
  year: number;
  co2_mmmt: number;
}

// New interface for Degree Days data
export interface DegreeDaysData {
  state: string;
  year: number;
  hdd: number;
  cdd: number;
}

/**
 * Hook to fetch and combine raw climate data files into a climate artifact structure
 */
export function useRawClimateArtifact() {
  // Fetch multiple climate data files
  const queries = useQueries({
    queries: [
      {
        queryKey: ['city-annual-avg-temp'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('city-temp-data-fetch-start');
            
            // Fetch the city temperature data
            const response = await fetch('/climate/city_annual_avg_temp.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch city temperature data: ${response.statusText}`);
            }
            
            // Parse the JSON
            const data: CityTempData[] = await response.json();
            
            // End fetch measurement
            perf.mark('city-temp-data-fetch-end');
            perf.measure('city-temp-data-fetch', 'city-temp-data-fetch-start', 'city-temp-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'city-annual-avg-temp',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'city-annual-avg-temp',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['city-annual-precip-mm'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('city-precip-data-fetch-start');
            
            // Fetch the city precipitation data
            const response = await fetch('/climate/city_annual_precip_mm.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch city precipitation data: ${response.statusText}`);
            }
            
            // Parse the JSON
            const data: CityPrecipData[] = await response.json();
            
            // End fetch measurement
            perf.mark('city-precip-data-fetch-end');
            perf.measure('city-precip-data-fetch', 'city-precip-data-fetch-start', 'city-precip-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'city-annual-precip-mm',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'city-annual-precip-mm',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['disasters-by-year'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('disasters-data-fetch-start');
            
            // Fetch the disaster data
            const response = await fetch('/climate/disasters_by_year.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch disaster data: ${response.statusText}`);
            }
            
            // Parse the JSON
            const data: DisasterData[] = await response.json();
            
            // End fetch measurement
            perf.mark('disasters-data-fetch-end');
            perf.measure('disasters-data-fetch', 'disasters-data-fetch-start', 'disasters-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'disasters-by-year',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'disasters-by-year',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['wildfires-acres-by-year'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('wildfires-data-fetch-start');
            
            // First, try to fetch the primary wildfire data
            let response = await fetch('/climate/wildfires_acres_by_year.json');
            if (!response.ok) {
              // If the primary file fails, try the alternative file
              response = await fetch('/climate/nifc_wildfires.json');
              
              if (!response.ok) {
                throw new Error(`Failed to fetch wildfire data: ${response.statusText}`);
              }
              
              // Parse the NIFC JSON with different structure
              const nifcData = await response.json();
              
              // Extract and transform the acres and fires arrays to match our expected format
              if (nifcData.national && nifcData.national.wildfires) {
                const acresData = nifcData.national.wildfires.acres || [];
                const firesData = nifcData.national.wildfires.fires || [];
                
                // Transform to our expected format
                const data: WildfireData[] = acresData.map((item: [number, number], index: number) => {
                  const year = item[0];
                  const acres = item[1];
                  const fires = firesData.find((f: [number, number]) => f[0] === year)?.[1] || 0;
                  
                  return {
                    year,
                    acres,
                    fires
                  };
                });
                
                // End fetch measurement
                perf.mark('wildfires-data-fetch-end');
                perf.measure('wildfires-data-fetch', 'wildfires-data-fetch-start', 'wildfires-data-fetch-end');
                
                // Log the successful data fetch
                logger.event('climate_data_load', {
                  status: 'success',
                  dataType: 'nifc-wildfires',
                  records: data.length
                });
                
                return data;
              } else {
                throw new Error('Invalid NIFC wildfire data format');
              }
            }
            
            // Parse the JSON for the primary file
            const data: WildfireData[] = await response.json();
            
            // End fetch measurement
            perf.mark('wildfires-data-fetch-end');
            perf.measure('wildfires-data-fetch', 'wildfires-data-fetch-start', 'wildfires-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'wildfires-acres-by-year',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'wildfires-data',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      // New query for CO2 data
      {
        queryKey: ['state-co2-mmmt'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('co2-data-fetch-start');
            
            // Fetch the state CO2 data
            const response = await fetch('/climate/state_co2_mmmt.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch CO2 data: ${response.statusText}`);
            }
            
            // Parse the JSON
            const data: CO2Data[] = await response.json();
            
            // End fetch measurement
            perf.mark('co2-data-fetch-end');
            perf.measure('co2-data-fetch', 'co2-data-fetch-start', 'co2-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'state-co2-mmmt',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'state-co2-mmmt',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
      // New query for Degree Days data
      {
        queryKey: ['state-degree-days'],
        queryFn: async () => {
          try {
            // Start performance measurement
            perf.mark('degree-days-data-fetch-start');
            
            // Fetch the state degree days data
            const response = await fetch('/climate/state_degree_days.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch degree days data: ${response.statusText}`);
            }
            
            // Parse the JSON
            const data: DegreeDaysData[] = await response.json();
            
            // End fetch measurement
            perf.mark('degree-days-data-fetch-end');
            perf.measure('degree-days-data-fetch', 'degree-days-data-fetch-start', 'degree-days-data-fetch-end');
            
            // Log the successful data fetch
            logger.event('climate_data_load', {
              status: 'success',
              dataType: 'state-degree-days',
              records: data.length
            });
            
            return data;
          } catch (error) {
            // Log the error
            logger.event('climate_data_load', {
              status: 'error',
              dataType: 'state-degree-days',
              error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
          }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      }
    ]
  });

  const [cityTempQuery, cityPrecipQuery, disastersQuery, wildfiresQuery, co2Query, degreeDaysQuery] = queries;
  
  // Combine all data into the climate artifact structure
  const combinedData: ClimateArtifact | undefined = 
    cityTempQuery.data && cityPrecipQuery.data && disastersQuery.data && wildfiresQuery.data && co2Query.data && degreeDaysQuery.data ? 
    createClimateArtifact(
      cityTempQuery.data, 
      cityPrecipQuery.data, 
      disastersQuery.data, 
      wildfiresQuery.data,
      co2Query.data,
      degreeDaysQuery.data
    ) : undefined;
  
  return {
    data: combinedData,
    isLoading: cityTempQuery.isLoading || cityPrecipQuery.isLoading || disastersQuery.isLoading || wildfiresQuery.isLoading || co2Query.isLoading || degreeDaysQuery.isLoading,
    isError: cityTempQuery.isError || cityPrecipQuery.isError || disastersQuery.isError || wildfiresQuery.isError || co2Query.isError || degreeDaysQuery.isError,
    error: cityTempQuery.error || cityPrecipQuery.error || disastersQuery.error || wildfiresQuery.error || co2Query.error || degreeDaysQuery.error,
  };
}

/**
 * Create a climate artifact from raw data files
 */
export function createClimateArtifact(
  cityTemps: CityTempData[],
  cityPrecip: CityPrecipData[],
  disasters: DisasterData[],
  wildfires: WildfireData[],
  co2Data: CO2Data[],
  degreeDaysData: DegreeDaysData[]
): ClimateArtifact {
  // City mapping from full names to IDs
  const CITY_MAPPING: Record<string, string> = {
    "Seattle": "seattle",
    "Los Angeles": "los-angeles",
    "Chicago": "chicago",
    "Houston": "houston",
    "Atlanta": "atlanta",
    "New York City": "new-york"
  };

  // State to city mapping for associating CO2 data with cities
  // Using FIPS state codes to match the CO2 data format
  const STATE_TO_CITY_MAPPING: Record<string, string> = {
    "WA": "seattle",
    "CA": "los-angeles",
    "IL": "chicago",
    "TX": "houston",
    "GA": "atlanta",
    "NY": "new-york"
  };

  // Create cities object
  const cities: Record<string, any> = {};
  
  // Process city temperature data
  const cityNames = Array.from(new Set(cityTemps.map(item => item.city)));
  cityNames.forEach(cityName => {
    const cityId = CITY_MAPPING[cityName] || cityName.toLowerCase().replace(/\s+/g, '-');
    const cityData = cityTemps.filter(item => item.city === cityName);
    
    // Convert temperature from Celsius to Fahrenheit for consistency with existing code
    const tempAnomalyData: [number, number | null][] = cityData.map(item => [
      item.year, 
      item.avg_temp_c !== null ? Number((item.avg_temp_c * 9/5).toFixed(2)) : null
    ]);
    
    // Process precipitation data for this city
    const precipData: [number, number | null][] = cityPrecip
      .filter(item => item.city === cityName)
      .map(item => [item.year, item.precip_mm !== null ? Number((item.precip_mm / 25.4).toFixed(2)) : null]); // Convert mm to inches
    
    cities[cityId] = {
      series: {
        annual: {
          tempAnomaly: tempAnomalyData,
          precipTotal: precipData,
          // Add placeholder data for other fields that might be needed
          extremes: {
            hotDays90F: cityData.map(item => [item.year, null]), // Placeholder
            warmNights70F: cityData.map(item => [item.year, null]), // Placeholder
            coldDays32F: cityData.map(item => [item.year, null]), // Placeholder
            max1DayPrecip: precipData.map(([year, value]) => [year, null]), // Placeholder
            max5DayPrecip: precipData.map(([year, value]) => [year, null]), // Placeholder
          }
        }
      },
      metadata: {
        sources: ["NOAA GHCN-Daily"],
        cityFips: "", // Placeholder
        stateFips: "", // Placeholder
        stateId: "", // Placeholder
      }
    };
  });

  // Process CO2 data by state
  const stateCO2Data: Record<string, [number, number | null][]> = {};
  
  // Group CO2 data by state (convert to lowercase to match the state picker)
  const states = Array.from(new Set(co2Data.map(item => item.state)));
  console.log('Processing CO2 data for states:', states);
  states.forEach(state => {
    const stateData = co2Data.filter(item => item.state === state);
    // Convert state code to lowercase to match the state picker component
    const lowerStateCode = state.toLowerCase();
    stateCO2Data[lowerStateCode] = stateData.map(item => [item.year, item.co2_mmmt]);
    console.log(`Processed ${stateData.length} CO2 records for state ${state} (${lowerStateCode})`);
  });

  // Process Degree Days data by state
  const stateDegreeDaysData: Record<string, { hdd: [number, number | null][], cdd: [number, number | null][] }> = {};
  
  // Group Degree Days data by state (convert to lowercase to match the state picker)
  const degreeDaysStates = Array.from(new Set(degreeDaysData.map(item => item.state)));
  console.log('Processing Degree Days data for states:', degreeDaysStates);
  degreeDaysStates.forEach(state => {
    const stateData = degreeDaysData.filter(item => item.state === state);
    // Convert state code to lowercase to match the state picker component
    const lowerStateCode = state.toLowerCase();
    stateDegreeDaysData[lowerStateCode] = {
      hdd: stateData.map(item => [item.year, item.hdd]),
      cdd: stateData.map(item => [item.year, item.cdd])
    };
    console.log(`Processed ${stateData.length} Degree Days records for state ${state} (${lowerStateCode})`);
  });

  // Process national data (using average of cities as placeholder)
  const years = Array.from(new Set(cityTemps.map(item => item.year))).sort();
  
  // Calculate average temperature for each year across all cities
  const avgTemps: [number, number | null][] = [];
  const avgPrecip: [number, number | null][] = [];
  
  years.forEach(year => {
    // Temperature
    const yearTempData = cityTemps.filter(item => item.year === year);
    if (yearTempData.length > 0) {
      const avgTempC = yearTempData.reduce((sum, item) => sum + item.avg_temp_c, 0) / yearTempData.length;
      const avgTempF = Number((avgTempC * 9/5).toFixed(2));
      avgTemps.push([year, avgTempF]);
    } else {
      avgTemps.push([year, null]);
    }
    
    // Precipitation
    const yearPrecipData = cityPrecip.filter(item => item.year === year);
    if (yearPrecipData.length > 0) {
      const avgPrecipMM = yearPrecipData.reduce((sum, item) => sum + item.precip_mm, 0) / yearPrecipData.length;
      const avgPrecipIn = Number((avgPrecipMM / 25.4).toFixed(2));
      avgPrecip.push([year, avgPrecipIn]);
    } else {
      avgPrecip.push([year, null]);
    }
  });
  
  // Process disaster data
  const disasterData: [number, number | null][] = disasters.map(item => [item.year, item.total]);
  
  // Process hurricane data
  const hurricaneData: [number, number | null][] = disasters.map(item => [item.year, item.hurricanes]);
  
  // Process wildfire data from disasters file
  const disasterWildfireData: [number, number | null][] = disasters.map(item => [item.year, item.wildfires]);
  
  // Process wildfire data
  const wildfireAcresData: [number, number | null][] = wildfires.map(item => [
    item.year, 
    item.acres_burned || item.acres || 0
  ]);
  const wildfireFiresData: [number, number | null][] = wildfires.map(item => [
    item.year, 
    item.fires || 0
  ]);

  // Aggregate national CO2 data (sum of all states)
  console.log('Aggregating national CO2 data for years:', years.length);
  const nationalCO2Data: [number, number | null][] = years.map(year => {
    let totalCO2 = 0;
    let hasData = false;
    
    // Use the lowercase state codes for aggregation
    Object.keys(stateCO2Data).forEach(stateKey => {
      const stateYearData = stateCO2Data[stateKey]?.find(([y, _]) => y === year);
      if (stateYearData && stateYearData[1] !== null) {
        totalCO2 += stateYearData[1];
        hasData = true;
      }
    });
    
    return [year, hasData ? totalCO2 : null];
  });
  console.log(`Processed ${nationalCO2Data.filter(d => d[1] !== null).length} national CO2 records`);

  // Aggregate national degree days data (average of all states)
  console.log('Aggregating national degree days data');
  
  // Get all years from degree days data
  const degreeYears = Array.from(new Set(
    Object.values(stateDegreeDaysData).flatMap(data => 
      [...data.hdd.map(([y]) => y), ...data.cdd.map(([y]) => y)]
    )
  )).sort();
  
  // Calculate average HDD and CDD for each year across all states
  const nationalHDD: [number, number | null][] = [];
  const nationalCDD: [number, number | null][] = [];
  
  degreeYears.forEach(year => {
    // HDD calculation
    let totalHDD = 0;
    let hddCount = 0;
    
    // CDD calculation
    let totalCDD = 0;
    let cddCount = 0;
    
    // Calculate sums and counts for each state
    Object.keys(stateDegreeDaysData).forEach(stateKey => {
      // Find HDD for this year and state
      const stateHDDYearData = stateDegreeDaysData[stateKey]?.hdd.find(([y]) => y === year);
      if (stateHDDYearData && stateHDDYearData[1] !== null) {
        totalHDD += stateHDDYearData[1];
        hddCount++;
      }
      
      // Find CDD for this year and state
      const stateCDDYearData = stateDegreeDaysData[stateKey]?.cdd.find(([y]) => y === year);
      if (stateCDDYearData && stateCDDYearData[1] !== null) {
        totalCDD += stateCDDYearData[1];
        cddCount++;
      }
    });
    
    // Calculate averages
    nationalHDD.push([year, hddCount > 0 ? Math.round(totalHDD / hddCount) : null]);
    nationalCDD.push([year, cddCount > 0 ? Math.round(totalCDD / cddCount) : null]);
  });

  // Create state entries with CO2 data and Degree Days data
  const stateEntries: Record<string, any> = {};
  
  // Add CO2 data and Degree Days data for all states in the dataset
  const allStates = Array.from(new Set([...states, ...degreeDaysStates]));
  allStates.forEach(stateCode => {
    // Convert to lowercase to match the state picker
    const lowerStateCode = stateCode.toLowerCase();
    
    stateEntries[lowerStateCode] = {
      series: {
        annual: {
          // Use national data as placeholder for state data that's not specifically available
          wildfire: {
            acresBurned: wildfireAcresData,
            fires: wildfireFiresData
          },
          emissions: {
            co2: stateCO2Data[lowerStateCode] || []
          },
          degreeDays: {
            hdd: stateDegreeDaysData[lowerStateCode]?.hdd || [],
            cdd: stateDegreeDaysData[lowerStateCode]?.cdd || []
          }
        }
      },
      metadata: {
        sources: ["NOAA", "FEMA", "NIFC", "EIA SEDS"],
        stateFips: stateCode
      }
    };
  });

  return {
    meta: {
      version: 1,
      updated: new Date().toISOString().split('T')[0],
      basePeriod: "1991-2020",
      units: {
        temp: "°F",
        precip: "inches",
        disasters: "count",
        wildfire: "acres/fires",
        co2: "MMT", // Million Metric Tons
        degreeDays: "°F·day" // Fahrenheit-days
      }
    },
    cities,
    national: {
      series: {
        annual: {
          tempAnomaly: avgTemps,
          precipTotal: avgPrecip,
          disasters: {
            total: disasterData,
            hurricane: hurricaneData,
            wildfire: disasterWildfireData
          },
          wildfire: {
            acresBurned: wildfireAcresData,
            fires: wildfireFiresData
          },
          emissions: {
            co2: nationalCO2Data
          },
          degreeDays: {
            hdd: nationalHDD,
            cdd: nationalCDD
          }
        }
      },
      metadata: {
        sources: ["NOAA", "FEMA", "NIFC", "EIA SEDS"]
      }
    },
    // Add state-level data with CO2 data and Degree Days data
    states: stateEntries,
    global: {
      series: {
        annual: {
          tempAnomaly: avgTemps, // Use national as placeholder for global
          precipTotal: avgPrecip
        }
      },
      metadata: {
        sources: ["NOAA", "FEMA", "NIFC"]
      }
    }
  };
}