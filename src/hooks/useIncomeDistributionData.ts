import { useQuery } from '@tanstack/react-query';
import { IncomeDistribution } from '@/types/tax';

async function fetchIncomeDistribution(): Promise<IncomeDistribution> {
  const res = await fetch('/federal_budget/income_distribution.json');
  if (!res.ok) {
    throw new Error('Failed to fetch income distribution data');
  }
  return res.json();
}

export function useIncomeDistributionData() {
  return useQuery<IncomeDistribution>({
    queryKey: ['incomeDistributionData'],
    queryFn: fetchIncomeDistribution,
    staleTime: Infinity,
  });
}