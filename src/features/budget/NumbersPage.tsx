"use client";
import { useState, useEffect, useMemo, Suspense } from 'react'; // Import Suspense
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
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
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
const Treemap = dynamic(() => import('@/charts/Treemap').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />
});
const Sunburst = dynamic(() => import('@/charts/Sunburst').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />
});
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
const StoryMode = dynamic(() => import('@/components/StoryMode').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="h-64 bg-platform-contrast/30 animate-pulse" />
});
const DrillPanel = dynamic(() => import('@/components/DrillPanel').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
});

// Function to transform our tree data for the treemap
const transformDataForTreemap = (node: ProcessedBudgetNode, year: number): any => {
  const value = node.values[year]?.nominal || 0;
  return {
    id: node.id,
    name: node.name,
    value: value > 0 ? value : 0,
    children: node.children.map(child => transformDataForTreemap(child, year)),
  };
};

export default function BudgetExplorePage() {
  const { rollup, hierarchy, terms, isLoading: isBudgetDataLoading } = useBudgetData(); // Get loading state
  const { year, highlightedNodeIds } = useUi();
  const { root } = useHierarchy();
  
  // Centralized page readiness check
  const isPageReady = useChartReady([rollup, hierarchy, terms]);

  const treemapData = useMemo(() => {
    if (!root) return null;
    return transformDataForTreemap(root, year);
  }, [root, year]); // Memoize treemapData

  // Log component initialization
  useEffect(() => {
    logChartStart('BudgetExplorePage', { year });
    chartLogger.logEnvironment('BudgetExplorePage');
  }, []);

  // Log data loading state
  useEffect(() => {
    logDataLoad('BudgetExplorePage', {
      hasRollup: !!rollup,
      hasHierarchy: !!hierarchy,
      hasTerms: !!terms,
      year,
      rollupYearsCount: rollup?.years ? Object.keys(rollup.years).length : 0
    });
  }, [rollup, hierarchy, terms, year]);

  // Log charts ready state changes
  useEffect(() => {
    logChartReady('BudgetExplorePage', { isPageReady });
  }, [isPageReady]);

  // Show page skeleton while essential budget data is loading
  if (isBudgetDataLoading || !rollup || !rollup.years) {
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

  chartLogger.log('BudgetExplorePage', 'RENDERING_PAGE', {
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
        {/* Federal Spending Breakdown - Full Width */}
        <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-center mb-2 text-platform-text">Federal Spending Breakdown for {year}</h3>
          <div className="flex-1">
            <Suspense fallback={<div className="w-full h-full bg-platform-contrast/30 animate-pulse" />}>
              {isPageReady && treemapData ? (
                <Treemap data={treemapData} highlightedNodeIds={highlightedNodeIds} isParentReady={isPageReady} />
              ) : (
                <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />
              )}
            </Suspense>
          </div>
        </div>
        
        {/* Spending Drilldown and Spending Details - Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
          <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast flex flex-col h-[500px]">
            <h3 className="text-lg font-semibold text-center mb-2 text-platform-text">Spending Drilldown for {year}</h3>
            <div className="flex-1">
              <Suspense fallback={<div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />}>
                {isPageReady && root ? (
                  <Sunburst data={treemapData} isParentReady={isPageReady} />
                ) : (
                  <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />
                )}
              </Suspense>
            </div>
          </div>
          
          <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast flex flex-col h-[500px]">
            <h3 className="text-lg font-semibold text-center mb-2 text-platform-text">Spending Details</h3>
            <div className="flex-1">
              <Suspense fallback={<div className="w-full h-full bg-platform-contrast/30 animate-pulse" />}>
                {isPageReady && root ? (
                  <DrillPanel isParentReady={isPageReady} />
                ) : (
                  <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />
                )}
              </Suspense>
            </div>
          </div>
        </div>
        
        {/* Budget Stories */}
        <div className="bg-platform-card-background rounded-lg border border-platform-contrast">
          <div className="p-6">
            <h2 className="text-xl font-bold text-platform-text mb-4">Budget Stories</h2>
          </div>
          <div className="h-[800px]">
            <Suspense fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}>
              {isPageReady && root ? (
                <StoryMode year={year} />
              ) : (
                <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
              )}
            </Suspense>
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