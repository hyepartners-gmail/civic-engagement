"use client";
import { useMemo, useState, useEffect, Suspense } from 'react';
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
import { useChartReady } from '@/hooks/useChartReady';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Define CpiDataItem interface directly here
interface CpiDataItem {
  year: number;
  cpi: number;
}

// Import named exports for charts
import { TimelineStackedChart } from '@/charts/TimelineStacked';
import { DeficitBarChartComponent } from '@/charts/DebtChangeTimeline';
import CPIChartComponent from '@/charts/CPIChart';

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

// Function to transform our tree data for the treemap, with depth limiting
const transformDataForTreemap = (node: ProcessedBudgetNode, year: number, currentDepth: number, maxDepth: number): any => {
  const value = node.values[year]?.nominal || 0;
  
  // If current depth exceeds maxDepth, stop recursing for children
  if (currentDepth >= maxDepth) {
    return {
      id: node.id,
      name: node.name,
      value: value > 0 ? value : 0,
      children: [], // No children beyond maxDepth
    };
  }

  return {
    id: node.id,
    name: node.name,
    value: value > 0 ? value : 0,
    children: node.children.map(child => transformDataForTreemap(child, year, currentDepth + 1, maxDepth)),
  };
};

// Function to transform our tree data for the sunburst, with depth limiting
const transformDataForSunburst = (node: ProcessedBudgetNode, year: number, currentDepth: number, maxDepth: number): any => {
  const value = node.values[year]?.nominal || 0;

  // If current depth exceeds maxDepth, stop recursing for children
  if (currentDepth >= maxDepth) {
    return {
      id: node.id,
      name: node.name,
      value: value > 0 ? value : 0,
      children: [], // No children beyond maxDepth
    };
  }

  return {
    id: node.id,
    name: node.name,
    value: value > 0 ? value : 0,
    children: node.children.map(child => transformDataForSunburst(child, year, currentDepth + 1, maxDepth)),
  };
};

export default function BudgetExplorePage() {
  const { rollup, hierarchy, terms, isLoading: isBudgetDataLoading } = useBudgetData();
  const { year, highlightedNodeIds } = useUi();
  const { root } = useHierarchy();
  
  // --- New state for max rendering depth ---
  const [maxRenderDepth, setMaxRenderDepth] = useState(2); // Start with depth 2 (top-level functions)
  // --- End new state for max rendering depth ---

  // Centralized page readiness check
  const isPageReady = useChartReady([rollup, hierarchy, terms]);

  const treemapData = useMemo(() => {
    if (!root) return null;
    return transformDataForTreemap(root, year, 0, maxRenderDepth); // Pass maxRenderDepth
  }, [root, year, maxRenderDepth]);

  const sunburstData = useMemo(() => {
    if (!root) return null;
    return transformDataForSunburst(root, year, 0, maxRenderDepth); // Pass maxRenderDepth
  }, [root, year, maxRenderDepth]);

  // --- New state for minimum loading spinner display time ---
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);
  const minDisplayTimeMs = 500; // Minimum 500ms display time

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBudgetDataLoading) {
      setShowLoadingSpinner(true);
    } else {
      timer = setTimeout(() => {
        setShowLoadingSpinner(false);
      }, minDisplayTimeMs);
    }
    return () => clearTimeout(timer);
  }, [isBudgetDataLoading]);
  // --- End new state for minimum loading spinner display time ---

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
  if (showLoadingSpinner || !rollup || !rollup.years) {
    chartLogger.log('BudgetExplorePage', 'RENDER_BLOCKED_NO_DATA', {
      hasRollup: !!rollup,
      hasRollupYears: !!(rollup?.years),
      hasHierarchy: !!hierarchy,
      hasTerms: !!terms,
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
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-platform-text">Federal Spending Breakdown for {year}</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="max-depth-select" className="text-sm text-platform-text/70">Max Depth:</Label>
              <Select value={String(maxRenderDepth)} onValueChange={(value) => setMaxRenderDepth(Number(value))}>
                <SelectTrigger id="max-depth-select" className="w-[80px] h-8 bg-platform-contrast border-platform-accent/50 text-platform-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                {isPageReady && sunburstData ? (
                  <Sunburst data={sunburstData} isParentReady={isPageReady} />
                ) : (
                  <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />
                )}
              </Suspense>
            </div>
          </div>
          
          <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast flex flex-col h-[500px] overflow-y-auto">
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
  <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
    <LoadingSpinner spinnerSize="lg" message="loading budget explorer" className="bg-platform-card-background p-8 rounded-lg shadow-lg" />
  </div>
);