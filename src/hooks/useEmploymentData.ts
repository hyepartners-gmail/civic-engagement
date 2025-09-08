import { useQuery } from '@tanstack/react-query';
import { EmploymentArtifact, Unit } from '@/types/employment';

interface NewEmploymentSeries {
  name: string;
  unit: string;
  topic: string;
  freq: string;
  agg_hint: string;
  monthly: [string, number][];
  fy?: [string, number][];
}

interface NewEmploymentFile {
  meta?: {
    notes: string[];
  };
  series?: Record<string, NewEmploymentSeries>;
  derived?: Record<string, NewEmploymentSeries>;
}

interface EmploymentIndex {
  files: Record<string, string[]>;
  notes: string[];
}

async function loadEmploymentIndex(): Promise<EmploymentIndex> {
  console.log('Loading employment index from /employment/employment.index.json');
  try {
    const res = await fetch(`/employment/employment.index.json?t=${new Date().getTime()}`, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error('Failed to fetch employment index:', res.status, res.statusText);
      throw new Error(`Failed to fetch employment index: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('Successfully loaded employment index:', data);
    return data;
  } catch (error) {
    console.error('Error in loadEmploymentIndex:', error);
    throw error;
  }
}

async function loadEmploymentFile(filename: string): Promise<NewEmploymentFile> {
  console.log(`Loading employment file: /employment/${filename}`);
  try {
    const res = await fetch(`/employment/${filename}?t=${new Date().getTime()}`, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch ${filename}:`, res.status, res.statusText);
      throw new Error(`Failed to fetch ${filename}: ${res.status} ${res.statusText}`);
    }
    
    // Get the raw text first to handle the NaN values that would cause JSON.parse to fail
    const rawText = await res.text();
    
    // Replace unquoted NaN values with null (which is valid JSON)
    const validJsonText = rawText.replace(/: NaN/g, ': null');
    
    try {
      const data = JSON.parse(validJsonText);
      console.log(`Successfully loaded ${filename}, found keys:`, Object.keys(data));
      return data;
    } catch (parseError) {
      console.error(`JSON parse error in ${filename}:`, parseError);
      throw new Error(`Failed to parse JSON in ${filename}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    throw error;
  }
}

function transformToLegacyFormat(files: Record<string, NewEmploymentFile>, indexFile: EmploymentIndex): EmploymentArtifact {
  console.log('Beginning transformation with files:', Object.keys(files));
  console.log('Index file lists these files:', Object.keys(indexFile.files));
  
  const allSeriesData: Record<string, NewEmploymentSeries> = {};
  const allDates = new Set<string>();
  const allDerivedData: Record<string, NewEmploymentSeries> = {}; // Track derived data specifically

  const processSeriesSource = (source: Record<string, NewEmploymentSeries> | undefined, filename: string) => {
    if (!source) {
      console.log(`No series data in ${filename}`);
      return;
    }
    
    console.log(`Processing ${Object.keys(source).length} series in ${filename}`);
    Object.entries(source).forEach(([key, series]) => {
      if (series) {
        // Filter out any monthly entries with null values (converted from NaN)
        if (series.monthly && Array.isArray(series.monthly)) {
          series.monthly = series.monthly.filter(entry => {
            return entry && entry.length === 2 && entry[0] && entry[1] !== null && !isNaN(entry[1]);
          });
        }
        
        // Also filter fiscal year entries if they exist
        if (series.fy && Array.isArray(series.fy)) {
          series.fy = series.fy.filter(entry => {
            return entry && entry.length === 2 && entry[0] && entry[1] !== null && !isNaN(entry[1]);
          });
        }
        
        // Use fiscal year data if monthly data is not available
        if (series.fy && series.fy.length > 0) {
          allSeriesData[key] = series;
          series.fy.forEach(([date]) => {
            if (date) allDates.add(date);
          });
        } else if (series.monthly && series.monthly.length > 0) {
          allSeriesData[key] = series;
          series.monthly.forEach(([date]) => {
            if (date) allDates.add(date);
          });
        } else {
          console.warn(`Series ${key} in ${filename} is missing valid data after filtering`);
        }
      } else {
        console.warn(`Series ${key} in ${filename} is undefined`);
      }
    });
  };

  Object.entries(files).forEach(([filename, fileContent]) => {
    console.log(`Processing file ${filename}`);
    processSeriesSource(fileContent.series, filename);
    
    // Process derived data and ensure it's stored separately
    if (fileContent.derived) {
      console.log(`Processing ${Object.keys(fileContent.derived).length} derived series in ${filename}`);
      Object.entries(fileContent.derived).forEach(([key, series]) => {
        if (series) {
          allDerivedData[key] = series;
          
          // Also add to allSeriesData for general processing
          if (series.fy && series.fy.length > 0) {
            allSeriesData[key] = series;
            series.fy.forEach(([date]) => {
              if (date) allDates.add(date);
            });
          } else if (series.monthly && series.monthly.length > 0) {
            allSeriesData[key] = series;
            series.monthly.forEach(([date]) => {
              if (date) allDates.add(date);
            });
          }
        }
      });
    } else {
      console.log(`No derived data in ${filename}`);
    }
  });

  console.log(`Found ${allDates.size} unique dates across all series`);
  console.log(`Found ${Object.keys(allSeriesData).length} series with data`);

  if (allDates.size === 0) {
    console.warn("No dates found in any of the loaded employment files. Returning an empty artifact.");
    return {
      index: [],
      series: {},
      units: {},
      meta: {
        notes: indexFile.notes,
        created_at: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  const sortedDates = Array.from(allDates).sort();
  const indexArray = sortedDates.map(date => {
    const [year, month] = date.split('-').map(Number);
    const fy = month >= 10 ? year + 1 : year;
    const fyMonth = month >= 10 ? month - 9 : month + 3;
    return { date: `${date}-01`, fy, fyMonth, period_type: 'month' as const };
  });

  const transformedSeries: Record<string, (number | null)[]> = {};
  const units: Record<string, Unit> = {};

  Object.entries(allSeriesData).forEach(([key, series]) => {
    if (series) {
      units[key] = series.unit as Unit;
      // Use fiscal year data if available, otherwise fall back to monthly
      const dateValueMap = new Map(series.fy || series.monthly || []);
      const dataArray = sortedDates.map(date => {
        const value = dateValueMap.get(date);
        // Filter out null, undefined, or NaN values
        return (value !== null && value !== undefined && !isNaN(value)) ? value : null;
      });
      transformedSeries[key] = dataArray;

      const underscoreKey = key.replace(/\./g, '_');
      if (underscoreKey !== key) {
        transformedSeries[underscoreKey] = dataArray;
        units[underscoreKey] = series.unit as Unit;
      }
    }
  });

  const allNotes = indexFile.notes.concat(
    Object.values(files).flatMap(file => file.meta?.notes || [])
  );

  return {
    index: indexArray,
    series: transformedSeries,
    derived: allDerivedData, // Include derived data in the artifact
    units,
    meta: {
      notes: allNotes,
      created_at: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

async function loadEmployment(): Promise<EmploymentArtifact> {
  try {
    console.log('Starting to load employment data...');
    const index = await loadEmploymentIndex();
    console.log(`Found ${Object.keys(index.files).length} files in index: ${Object.keys(index.files).join(', ')}`);
    
    const filePromises = Object.keys(index.files).map(async filename => {
      try {
        const data = await loadEmploymentFile(filename);
        return [filename, data] as const;
      } catch (error) {
        console.error(`Error loading file ${filename}:`, error);
        throw error;
      }
    });
    
    console.log('Waiting for all file promises to resolve...');
    const fileResults = await Promise.all(filePromises);
    console.log(`Successfully loaded ${fileResults.length} files`);
    
    const files = Object.fromEntries(fileResults);
    return transformToLegacyFormat(files, index);
  } catch (error) {
    console.error('Error in loadEmployment:', error);
    throw error;
  }
}

export function useEmploymentData() {
  return useQuery<EmploymentArtifact>({
    queryKey: ['employmentData'],
    queryFn: async () => {
      try {
        return await loadEmployment();
      } catch (error) {
        console.error('Error loading employment data:', error);
        throw error;
      }
    },
    staleTime: Infinity,
    retry: 2,
    retryDelay: 1000,
  });
}