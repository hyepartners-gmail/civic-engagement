import { useRawClimateArtifact } from './useRawClimateArtifact';
import { climateSchema } from '@/lib/climateSchema';
import { logger } from '@/lib/logger';
import { perf } from '@/lib/perf';

/**
 * Hook to fetch and validate climate data
 * This hook now uses individual JSON files instead of a single climate.json file
 */
export function useClimateArtifact() {
  const { data, isLoading, isError, error } = useRawClimateArtifact();
  
  if (!data) {
    return { data: undefined, isLoading, isError, error };
  }
  
  try {
    // Start validation measurement
    perf.mark('climate-data-validate-start');
    
    // Validate the data against the schema
    const result = climateSchema.parse(data);
    
    // End validation measurement
    perf.mark('climate-data-validate-end');
    perf.measure('climate-data-validate', 'climate-data-validate-start', 'climate-data-validate-end');
    
    // Log the successful data fetch
    logger.event('climate_data_load', {
      status: 'success',
      version: result.meta.version,
      updated: result.meta.updated,
      cities_count: Object.keys(result.cities).length
    });
    
    return { data: result, isLoading, isError, error: undefined };
  } catch (validationError) {
    // Log the error
    logger.event('climate_data_load', {
      status: 'error',
      error: validationError instanceof Error ? validationError.message : String(validationError)
    });
    
    return { data: undefined, isLoading: false, isError: true, error: validationError };
  }
}