import { useQuery } from '@tanstack/react-query';
import { TaxPolicyBundle } from '@/types/tax';

async function fetchTaxPolicy(): Promise<TaxPolicyBundle> {
  const res = await fetch('/federal_budget/tax_policy.json');
  if (!res.ok) {
    throw new Error('Failed to fetch tax policy data');
  }
  return res.json();
}

export function useTaxPolicyData() {
  return useQuery<TaxPolicyBundle>({
    queryKey: ['taxPolicyData'],
    queryFn: fetchTaxPolicy,
    staleTime: Infinity,
  });
}