import { useQuery } from '@tanstack/react-query';
import { Recession } from '@/types/employment';

interface EmploymentFile {
  derived?: {
    'nber.usrec'?: {
      monthly?: [string, number][];
      fy?: [string, number][];
    };
  };
  series?: {
    'nber.usrec'?: {
      monthly?: [string, number][];
      fy?: [string, number][];
    };
  };
}

async function extractRecessions(): Promise<Recession[]> {
  try {
    // Load the employment core data to extract recession periods
    const res = await fetch('/employment/employment.core.json');
    if (!res.ok) {
      return []; // Return empty array if no data available
    }
    
    const data: EmploymentFile = await res.json();
    const recessionSeries = data.derived?.['nber.usrec'] || data.series?.['nber.usrec'];
    
    // Use monthly data if available, otherwise try fiscal year data
    if (recessionSeries?.monthly && recessionSeries.monthly.length > 0) {
      // Extract recession periods from the binary indicator
      const recessions: Recession[] = [];
      let currentRecession: { start: string } | null = null;
      
      for (const [date, value] of recessionSeries.monthly) {
        if (value === 1.0 && !currentRecession) {
          // Start of recession
          currentRecession = { start: `${date}-01` };
        } else if (value === 0.0 && currentRecession) {
          // End of recession
          recessions.push({
            start: currentRecession.start,
            end: `${date}-01`
          });
          currentRecession = null;
        }
      }
      
      // Handle case where recession data ends during a recession
      if (currentRecession) {
        const lastDate = recessionSeries.monthly[recessionSeries.monthly.length - 1][0];
        recessions.push({
          start: currentRecession.start,
          end: `${lastDate}-01`
        });
      }
      
      return recessions;
    } 
    // Try to use fiscal year data if monthly is not available
    else if (recessionSeries?.fy && recessionSeries.fy.length > 0) {
      const recessions: Recession[] = [];
      let currentRecession: { start: string } | null = null;
      
      for (const [date, value] of recessionSeries.fy) {
        // For fiscal year data, convert the FY notation to a date
        // FY format is typically "FY2020", we'll convert to "2019-07-01" (start of fiscal year)
        const year = parseInt(date.replace('FY', ''));
        const dateStr = `${year-1}-07-01`; // July 1 of the previous year is start of fiscal year
        
        if (value === 1.0 && !currentRecession) {
          // Start of recession
          currentRecession = { start: dateStr };
        } else if (value === 0.0 && currentRecession) {
          // End of recession
          recessions.push({
            start: currentRecession.start,
            end: dateStr
          });
          currentRecession = null;
        }
      }
      
      // Handle case where recession data ends during a recession
      if (currentRecession) {
        const lastFY = recessionSeries.fy[recessionSeries.fy.length - 1][0];
        const lastYear = parseInt(lastFY.replace('FY', ''));
        const lastDateStr = `${lastYear-1}-07-01`;
        
        recessions.push({
          start: currentRecession.start,
          end: lastDateStr
        });
      }
      
      return recessions;
    }
    
    // If neither monthly nor fiscal year data is available
    return [];
  } catch (error) {
    console.warn('Could not extract recession data:', error);
    return [];
  }
}

export function useRecessions() {
  return useQuery<Recession[]>({
    queryKey: ['recessions'],
    queryFn: extractRecessions,
    staleTime: Infinity,
  });
}