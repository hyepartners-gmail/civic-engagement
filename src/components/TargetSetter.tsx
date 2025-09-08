"use client";
import { useState } from 'react';
import { useTax } from '@/contexts/TaxContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useScenarioProjection } from '@/hooks/useScenarioProjection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Target } from 'lucide-react';
import { TaxPolicyBundle, IncomeTaxPolicy, IncomeDistribution } from '@/types';
import { useIncomeDistributionData } from '@/hooks/useIncomeDistributionData';
import { useRevenueImpact } from '@/hooks/useRevenueImpact';

// A more accurate tax calculation function that iterates through brackets
const calculateTax = (income: number, policy: IncomeTaxPolicy) => {
  let totalTax = 0;
  const taxableIncome = Math.max(0, income - policy.standardDeduction);

  // Sort brackets by threshold to ensure correct calculation
  const sortedBrackets = [...policy.brackets].sort((a, b) => a.threshold - b.threshold);

  // Iterate through each bracket
  for (let i = 0; i < sortedBrackets.length; i++) {
    const currentBracket = sortedBrackets[i];
    const nextBracketThreshold = sortedBrackets[i + 1]?.threshold || Infinity;

    const incomeInThisTier = Math.min(taxableIncome, nextBracketThreshold) - currentBracket.threshold;

    if (incomeInThisTier > 0) {
      totalTax += incomeInThisTier * currentBracket.rate;
    } else if (taxableIncome < currentBracket.threshold) {
      break;
    }
  }
  return totalTax;
};

// Standalone calculation logic to determine revenue impact from policy changes
const calculateAnnualDelta = (policy: TaxPolicyBundle, baselinePolicy: TaxPolicyBundle, incomeDistribution: IncomeDistribution) => {
  let totalBaselineRevenue = 0;
  let totalCurrentRevenue = 0;

  for (const bin of incomeDistribution.bins) {
    const avgIncome = bin.avg_income;
    const numReturns = bin.num_returns;

    // Assuming 50/50 split between single and married_joint for aggregate calculation
    const baselineTaxSingle = calculateTax(avgIncome, baselinePolicy.incomeTax.single);
    const currentTaxSingle = calculateTax(avgIncome, policy.incomeTax.single);
    totalBaselineRevenue += baselineTaxSingle * numReturns * 0.5;
    totalCurrentRevenue += currentTaxSingle * numReturns * 0.5;

    const baselineTaxMarriedJoint = calculateTax(avgIncome, baselinePolicy.incomeTax.married_joint);
    const currentTaxMarriedJoint = calculateTax(avgIncome, policy.incomeTax.married_joint);
    totalBaselineRevenue += baselineTaxMarriedJoint * numReturns * 0.5;
    totalCurrentRevenue += currentTaxMarriedJoint * numReturns * 0.5;
  }
  return totalCurrentRevenue - totalBaselineRevenue;
};


export default function TargetSetter() {
  const { policy, setPolicy } = useTax();
  const { taxPolicy: baselinePolicy, rollup, macro, cboProjection } = useBudgetData();
  const { data: incomeDistribution } = useIncomeDistributionData();
  const { toast } = useToast();
  const [targetPct, setTargetPct] = useState(3); // Default target 3%

  const { byYear: revenueDeltas } = useRevenueImpact(policy, baselinePolicy!, incomeDistribution, rollup!, macro!);
  const scenario = { year: new Date().getFullYear(), deltas: {}, revenueDeltas };
  const projection = useScenarioProjection(rollup, scenario, macro, cboProjection);
  
  const handleSolve = () => {
    if (!baselinePolicy || !rollup || !macro || !projection || !incomeDistribution) return;

    const finalYear = projection.base[projection.base.length - 1];
    const finalYearGDP = macro.gdp[finalYear.year];
    const currentInterest = finalYear.netInterest;
    const targetInterest = (targetPct / 100) * finalYearGDP;

    if (currentInterest <= targetInterest) {
      toast({ title: "Target Met!", description: "Your current policy already meets this interest/GDP target." });
      return;
    }

    const interestReductionNeeded = currentInterest - targetInterest;
    const annualDeficitReduction = interestReductionNeeded / 10; // Simplified amortization

    const topBracketIndex = policy.incomeTax.married_joint.brackets.length - 1;
    if (topBracketIndex < 0) {
      toast({ variant: 'destructive', title: "Cannot Solve", description: "No tax brackets to adjust." });
      return;
    }

    const policyPlus1 = JSON.parse(JSON.stringify(policy));
    policyPlus1.incomeTax.married_joint.brackets[topBracketIndex].rate += 0.01;

    const currentRevenueDelta = calculateAnnualDelta(policy, baselinePolicy, incomeDistribution);
    const revenueDeltaPlus1 = calculateAnnualDelta(policyPlus1, baselinePolicy, incomeDistribution);
    const revenuePerPoint = revenueDeltaPlus1 - currentRevenueDelta;

    if (revenuePerPoint <= 0) {
      toast({ variant: 'destructive', title: "Cannot Solve", description: "Increasing the top rate does not yield more revenue in this model." });
      return;
    }

    const requiredRevenueIncrease = annualDeficitReduction;
    const requiredRateIncrease = requiredRevenueIncrease / revenuePerPoint;

    const newPolicy = JSON.parse(JSON.stringify(policy));
    newPolicy.incomeTax.married_joint.brackets[topBracketIndex].rate += requiredRateIncrease;
    
    setPolicy(newPolicy);

    toast({
      title: "Scenario Solved!",
      description: `Top tax rate increased by ${(requiredRateIncrease * 100).toFixed(1)}pp to meet your target.`,
    });
  };

  return (
    <div className="bg-platform-contrast/50 p-4 rounded-lg">
      <h4 className="font-semibold text-sm mb-2 text-platform-text">"What Would It Take?" Mode</h4>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="target-gdp" className="text-xs text-platform-text">Target Interest/GDP in 10 years</Label>
          <Input id="target-gdp" type="number" value={targetPct} onChange={e => setTargetPct(Number(e.target.value))} className="h-8 bg-platform-background" />
        </div>
        <Button onClick={handleSolve} size="sm" className="h-8">
          <Target className="h-4 w-4 mr-2" />
          Solve
        </Button>
      </div>
    </div>
  );
}