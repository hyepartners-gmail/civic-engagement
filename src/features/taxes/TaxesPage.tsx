"use client";
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useTax } from '@/contexts/TaxContext';
import { useLab } from '@/contexts/LabContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useRevenueImpact } from '@/hooks/useRevenueImpact';
import { useScenarioProjection } from '@/hooks/useScenarioProjection';
import BracketEditor from './BracketEditor';
import RevenueImpactPanel from './RevenueImpactPanel';
import TaxToggleCards from './TaxToggleCards';
import { AlertCircle, FlaskConical } from 'lucide-react';
import { fmtPct } from '@/utils/number';
import { Button } from '@/components/ui/button';
import HistoricalInterestContext from '@/components/HistoricalInterestContext';
import TargetSetter from '@/components/TargetSetter';
import dynamic from 'next/dynamic';
import InterestVsChip from '@/components/InterestVsChip';
import BudgetNavigation from '@/components/BudgetNavigation';
import { baselinePolicy } from '@/lib/baselinePolicies'; // Import the static baseline
// Removed import { useSoiData } from '@/hooks/useSoiData';
import { useTaxPolicyData } from '@/hooks/useTaxPolicyData';
import PartyBand from '@/components/PartyBand';
import fastDeepEqual from 'fast-deep-equal';
import { useIncomeDistributionData } from '@/hooks/useIncomeDistributionData';

// Import named exports for charts
import { DeficitBarChartComponent } from '@/charts/DebtChangeTimeline';
import CPIChartComponent from '@/charts/CPIChart'; // Corrected: Use default import for CPIChart

const DistributionBars = dynamic(() => import('@/features/taxes/DistributionBars'), { ssr: false });
const InterestProjection = dynamic(() => import('@/charts/InterestProjection'), { ssr: false });
const HistoricalRatesChart = dynamic(() => import('@/charts/HistoricalRatesChart'), { ssr: false });
const TopBracketThresholdChart = dynamic(() => import('@/charts/TopBracketThresholdChart'), { ssr: false });

export default function TaxesPageContent() {
  const { policy } = useTax();
  const { setScenario } = useLab();
  const router = useRouter();
  const { rollup, macro, terms, cboProjection } = useBudgetData();
  const { data: taxPolicy } = useTaxPolicyData();
  const { data: incomeDistribution, isLoading: isIncomeDistributionLoading } = useIncomeDistributionData();

  const hasPolicyChanged = useMemo(() => !fastDeepEqual(policy, baselinePolicy), [policy]);

  const { byYear: revenueDeltas, distribution, cumulative } = useRevenueImpact(
    policy,
    baselinePolicy, // Use the static baseline policy
    incomeDistribution,
    rollup,
    macro
  );

  const scenario = useMemo(() => ({
    year: new Date().getFullYear(),
    deltas: {},
    revenueDeltas,
  }), [revenueDeltas]);

  const projection = useScenarioProjection(rollup, scenario, macro, cboProjection);

  const historicalYears = useMemo(() => {
    if (!taxPolicy?.history) return { min: 1913, max: 2023 };
    const years = Object.keys(taxPolicy.history).map(Number);
    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [taxPolicy]);

  const handleApplyToLab = () => {
    setScenario({
      year: new Date().getFullYear(),
      deltas: {}, // Reset spending deltas
      revenueDeltas,
      customPrograms: [], // Reset custom programs
    });
    router.push('/budget/lab');
  };

  if (!rollup || !macro || isIncomeDistributionLoading) {
    return <PageSkeleton />;
  }

  const year = new Date().getFullYear() - 1;
  const annualDelta = revenueDeltas[year] || 0;
  const gdp = macro?.gdp[year] || 0;

  const finalProjectionYear = projection?.base[projection.base.length - 1];
  const interestToGdp = finalProjectionYear && macro?.gdp[finalProjectionYear.year]
    ? finalProjectionYear.netInterest / macro.gdp[finalProjectionYear.year]
    : 0;
  const showAlert = interestToGdp > 0.05;

  return (
    <div className="space-y-8">
      <BudgetNavigation />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
          <h3 className="text-lg font-semibold mb-4 text-center text-platform-text">Historical Top & Bottom Tax Rates</h3>
          <div className="h-[400px]">
            <HistoricalRatesChart />
          </div>
          {terms && (
            <PartyBand 
              terms={terms} 
              minYear={historicalYears.min} 
              maxYear={historicalYears.max} 
              className="mt-4"
              paddingLeft={60}
              paddingRight={80}
            />
          )}
        </div>
        <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
          <h3 className="text-lg font-semibold mb-4 text-center text-platform-text">Historical Top Income Bracket Threshold</h3>
          <div className="h-[400px]">
            <TopBracketThresholdChart />
          </div>
          {terms && (
            <PartyBand 
              terms={terms} 
              minYear={historicalYears.min} 
              maxYear={historicalYears.max} 
              className="mt-4"
              paddingLeft={80}
              paddingRight={20}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <BracketEditor />
          <TaxToggleCards />
          <RevenueImpactPanel annualDelta={annualDelta} cumulativeDelta={cumulative} gdp={gdp} />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <div className="h-[400px] bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
            <h3 className="text-lg font-semibold mb-4 text-center text-platform-text">Change in Tax Burden by Income Group</h3>
            {hasPolicyChanged ? (
              <DistributionBars data={distribution || []} />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-platform-text/70 p-4">
                <p>Change Income Tax Brackets or Alternative Taxes to see the impact on tax burden across income groups.</p>
              </div>
            )}
          </div>
          {/* New: Total Debt Projection Chart */}
          <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
            <h3 className="text-lg font-semibold mb-4 text-center text-platform-text">10-Year Total Debt Projection</h3>
            <div className="h-[400px]">
              {projection ? (
                <InterestProjection projection={projection} metric="debt" />
              ) : (
                <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />
              )}
            </div>
          </div>
          {/* Existing: Net Interest Projection Chart */}
          <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
            <h3 className="text-lg font-semibold mb-4 text-center text-platform-text">10-Year Net Interest Projection</h3>
            <div className="h-[400px]">
              {projection ? (
                <InterestProjection projection={projection} metric="netInterest" />
              ) : (
                <div className="animate-pulse bg-platform-contrast h-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast space-y-4">
        {projection && <InterestVsChip projection={projection.base} year={year + 10} />}
        <HistoricalInterestContext />
        <TargetSetter />
        {showAlert && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-1" />
            <div>
              <h4 className="font-bold text-red-400">Belt Tightening Needed</h4>
              <p className="text-sm text-platform-text/90">
                In 10 years, Net Interest is projected to be {fmtPct(interestToGdp)} of GDP, a potentially unsustainable level.
                Consider raising taxes or cutting spending to alter this trajectory.
              </p>
            </div>
          </div>
        )}
        <div className="pt-4 border-t border-platform-contrast">
          <Button onClick={handleApplyToLab} className="w-full" variant="platform-primary">
            <FlaskConical className="h-4 w-4 mr-2" />
            Apply this Tax Scenario to the Budget Lab
          </Button>
        </div>
      </div>
    </div>
  );
}

const PageSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-1 space-y-8">
      <div className="h-64 bg-platform-card-background rounded-lg animate-pulse" />
      <div className="h-48 bg-platform-card-background rounded-lg animate-pulse" />
    </div>
    <div className="lg:col-span-2 space-y-8">
      <div className="h-[400px] bg-platform-card-background rounded-lg animate-pulse" />
      <div className="h-[400px] bg-platform-card-background rounded-lg animate-pulse" />
    </div>
  </div>
);