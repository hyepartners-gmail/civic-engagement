import { useQuery } from '@tanstack/react-query';
import { GdpData } from '@/types/employment';

async function loadGdpData(): Promise<GdpData[]> {
  // No real GDP data available, return empty array
  // Components should handle empty data gracefully
  console.warn('GDP data not available - components will show limited functionality');
  return [];
}

export function useGdpData() {
  return useQuery<GdpData[]>({
    queryKey: ['gdpData'],
    queryFn: loadGdpData,
    staleTime: Infinity,
  });
}