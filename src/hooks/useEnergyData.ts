import { useQuery } from '@tanstack/react-query';
import { energySchema, EnergyData } from '@/lib/energySchema';

const fetcher = async (): Promise<EnergyData> => {
  // Use the API route to bypass any middleware/routing issues
  const res = await fetch("/api/energy-data");
  if (!res.ok) {
    throw new Error("Failed to fetch energy data");
  }
  const data = await res.json();
  return energySchema.parse(data);
};

export function useEnergyData() {
  return useQuery<EnergyData>({
    queryKey: ['energyData'],
    queryFn: fetcher,
    staleTime: Infinity,
  });
}