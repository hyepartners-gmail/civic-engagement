import { useMemo } from 'react';
import { TaxCalcInput, TaxPolicyBundle, IncomeTaxPolicy } from '../types/tax';

// A more accurate tax calculation function that iterates through brackets
const calculateTaxLiability = (
  income: number,
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'hoh',
  dependents: number,
  policy: IncomeTaxPolicy
) => {
  if (!policy || !policy.brackets || policy.brackets.length === 0) {
    return 0;
  }

  // Simplified deduction - in a real model, this would be more complex
  const deduction = policy.standardDeduction + (dependents * 2000);
  const taxableIncome = Math.max(0, income - deduction);

  let totalTax = 0;
  let incomeToTax = taxableIncome;

  // Sort brackets by threshold to ensure correct calculation
  const sortedBrackets = [...policy.brackets].sort((a, b) => a.threshold - b.threshold);

  for (let i = 0; i < sortedBrackets.length; i++) {
    const currentBracket = sortedBrackets[i];
    const nextBracketThreshold = sortedBrackets[i + 1]?.threshold || Infinity;

    // Amount of income within this bracket's range that is taxable
    const incomeInThisBracketRange = Math.min(incomeToTax, nextBracketThreshold) - currentBracket.threshold;

    if (incomeInThisBracketRange > 0) {
      totalTax += incomeInThisBracketRange * currentBracket.rate;
    } else if (taxableIncome < currentBracket.threshold) {
      // If taxable income is below the current bracket's threshold, we're done
      break;
    }
  }
  return totalTax;
};

export function usePersonalTax(input: TaxCalcInput, policy: TaxPolicyBundle | undefined) {
  const liability = useMemo(() => {
    if (!policy || !policy.incomeTax) {
      return { total: 0, error: 'Tax policy data not available.' };
    }
    
    let incomeTaxPolicyForCalculation: IncomeTaxPolicy;
    if (input.filingStatus === 'married_joint') {
      incomeTaxPolicyForCalculation = policy.incomeTax.married_joint;
    } else {
      incomeTaxPolicyForCalculation = policy.incomeTax.single;
    }

    const totalTax = calculateTaxLiability(
      input.income,
      input.filingStatus,
      input.dependents || 0,
      incomeTaxPolicyForCalculation
    );

    return { total: Math.max(0, totalTax), error: null };
  }, [input, policy]);

  return liability;
}