import { useQueries } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { perf } from '@/lib/perf';

// Define types for our data
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
  acres_burned: number;
  fires: number;
}

export interface ClimateData {
  cityTemps: CityTempData[];
  cityPrecip: CityPrecipData[];
  disasters: DisasterData[];
  wildfires: WildfireData[];
}

/**
 * Hook to fetch and validate climate data directly from individual JSON files
 */
export function useClimateData() {
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
            
            // Parse the JSON and transform it to match our interface
            const rawData: any[] = await response.json();
            const data: DisasterData[] = rawData.map(item => ({
              year: item.year,
              hurricanes: item.hurricanes || 0,
              wildfires: item.wildfires || 0,
              total: item.total || 0
            }));
            
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
            
            // Fetch the wildfire data
            const response = await fetch('/climate/wildfires_acres_by_year.json');
            if (!response.ok) {
              throw new Error(`Failed to fetch wildfire data: ${response.statusText}`);
            }
            
            // Parse the JSON
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
              dataType: 'wildfires-acres-by-year',
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

  const [cityTempQuery, cityPrecipQuery, disastersQuery, wildfiresQuery] = queries;
  
  return {
    data: cityTempQuery.data && cityPrecipQuery.data && disastersQuery.data && wildfiresQuery.data ? 
      { 
        cityTemps: cityTempQuery.data, 
        cityPrecip: cityPrecipQuery.data,
        disasters: disastersQuery.data,
        wildfires: wildfiresQuery.data
      } : undefined,
    isLoading: cityTempQuery.isLoading || cityPrecipQuery.isLoading || disastersQuery.isLoading || wildfiresQuery.isLoading,
    isError: cityTempQuery.isError || cityPrecipQuery.isError || disastersQuery.isError || wildfiresQuery.isError,
    error: cityTempQuery.error || cityPrecipQuery.error || disastersQuery.error || wildfiresQuery.error,
  };
}