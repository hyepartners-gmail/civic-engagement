"use client";
import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/Layout';
import BudgetNavigation from '@/components/BudgetNavigation';
import { useBudgetData } from '@/hooks/useBudgetData';
import BudgetKpiHeader from '@/components/BudgetKpiHeader';
import YearSlider from '@/components/YearSlider';
import ModeToggle from '@/components/ModeToggle';
import { useUi } from '@/contexts/UiContext';
import PartyBand from '@/components/PartyBand';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import { useHierarchy } from '@/hooks/useHierarchy';
import { useChartReady } from '@/hooks/useChartReady'; // Import useChartReady

// Define CpiDataItem interface directly here
interface CpiDataItem {
  year: number;
  cpi: number;
}

// Import named exports for charts
import { TimelineStackedChart } from '@/charts/TimelineStacked';
import { DeficitBarChartComponent } from '@/charts/DebtChangeTimeline';
import CPIChartComponent from '@/charts/CPIChart'; // Corrected: Use default import for CPIChart

// Dynamically import charts using named exports
const TimelineStacked = dynamic(() => Promise.resolve(TimelineStackedChart), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
});
const DeficitBarChart = dynamic(() => Promise.resolve(DeficitBarChartComponent), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
});
const CPIChart = dynamic(() => Promise.resolve(CPIChartComponent), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
});

export default function NumbersPage() {
  const { rollup, terms, hierarchy, cpiSeries, isLoading: isBudgetDataLoading } = useBudgetData();
  const { year } = useUi();
  
  // Centralized page readiness check
  const isPageReady = useChartReady([rollup, hierarchy, terms, cpiSeries]);

  // Calculate CPI data range for perfect alignment
  const cpiDataRange = useMemo(() => {
    if (!cpiSeries || !cpiSeries.cpi || Object.keys(cpiSeries.cpi).length === 0) {
      return { minYear: 1913, maxYear: 2025 };
    }
    const years = Object.keys(cpiSeries.cpi).map(Number);
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years)
    };
  }, [cpiSeries]);

  // Log component initialization
  useEffect(() => {
    logChartStart('NumbersPage', { year });
    chartLogger.logEnvironment('NumbersPage');
  }, []);

  // Log data loading state
  useEffect(() => {
    logDataLoad('NumbersPage', {
      hasRollup: !!rollup,
      hasHierarchy: !!hierarchy,
      hasTerms: !!terms,
      hasCpiSeries: !!cpiSeries, // Log cpiSeries status
      rollupYearsCount: rollup?.years ? Object.keys(rollup.years).length : 0
    });
  }, [rollup, terms, hierarchy, cpiSeries, year]); // Add cpiSeries to dependencies

  // Log charts ready state changes
  useEffect(() => {
    logChartReady('NumbersPage', { isPageReady });
  }, [isPageReady]);

  // Show page skeleton while essential budget data is loading
  if (isBudgetDataLoading || !rollup || !rollup.years || !hierarchy || !terms || !cpiSeries) {
    chartLogger.log('NumbersPage', 'RENDER_BLOCKED_NO_DATA', {
      hasRollup: !!rollup,
      hasRollupYears: !!(rollup?.years),
      hasHierarchy: !!hierarchy,
      hasTerms: !!terms,
      hasCpiSeries: !!cpiSeries,
      isPageReady
    });
    return (
      <Layout>
        <BudgetNavigation />
        <PageSkeleton />
      </Layout>
    );
  }

  const years = Object.keys(rollup.years).map(Number);
  const minYear = Math.min(...years);
  const maxYear = Math.min(Math.max(...years), 2024); // Cap at 2024 since that's the last year with actual data

  chartLogger.log('NumbersPage', 'RENDERING_PAGE', {
    yearsCount: years.length,
    minYear,
    maxYear,
    isPageReady,
    currentYear: year
  });

  return (
    <Layout>
      <BudgetNavigation />

      <div className="space-y-8 mt-8">
        <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/3 lg:w-1/4">
              <ModeToggle />
            </div>
            <div className="w-full md:w-2/3 lg:w-3/4">
              <div className="bg-gradient-to-r from-purple-900 via-purple-600 to-purple-400 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 text-center">Timeline (1962-2024)</h2>
                <YearSlider minYear={minYear} maxYear={maxYear} />
              </div>
            </div>
          </div>
        </div>
        
        <BudgetKpiHeader />

        <div className="bg-platform-card-background rounded-lg border border-platform-contrast">
          <div className="h-[500px]">
            {isPageReady ? (
              <TimelineStacked />
            ) : (
              <div className="h-full w-full bg-platform-contrast/30 animate-pulse flex items-center justify-center">
                <span className="text-platform-text/70">Loading timeline chart...</span>
              </div>
            )}
          </div>
          {terms && (
            <div className="px-6 pb-6">
              <PartyBand 
                terms={terms} 
                minYear={minYear} 
                maxYear={maxYear} 
                paddingLeft={36}
                paddingRight={86}
              />
            </div>
          )}
        </div>

        <div className="bg-platform-card-background rounded-lg border border-platform-contrast">
          <div className="p-6">
            <h2 className="text-xl font-bold text-platform-text mb-4">Annual Deficit by Presidential Term</h2>
          </div>
          <div className="h-[500px]">
            {isPageReady ? (
              <DeficitBarChart />
            ) : (
              <div className="h-full w-full bg-platform-contrast/30 animate-pulse flex items-center justify-center">
                <span className="text-platform-text/70">Loading budget chart...</span>
              </div>
            )}
          </div>
          {terms && (
            <div className="px-6 pb-6">
              <PartyBand 
                terms={terms} 
                minYear={minYear} 
                maxYear={maxYear} 
                paddingLeft={36}
                paddingRight={86}
              />
            </div>
          )}
        </div>
        
        <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-center mb-2 text-platform-text">Consumer Price Index (CPI)</h3>
          <div className="flex-1">
            {isPageReady ? (
              <CPIChart />
            ) : (
              <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Page-level skeleton loader
const PageSkeleton = () => (
  <div className="space-y-8 mt-8">
    <div className="bg-platform-card-background p-6 rounded-lg border border-platform-contrast animate-pulse h-32" />
    <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast animate-pulse h-[500px]" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast animate-pulse h-[500px]" />
      <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast animate-pulse h-[500px]" />
    </div>
    <div className="bg-platform-card-background rounded-lg border border-platform-contrast animate-pulse h-[800px]" />
  </div>
);