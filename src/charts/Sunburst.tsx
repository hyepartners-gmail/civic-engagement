"use client";
import { useUi } from '@/contexts/UiContext';
import { useHierarchy, ProcessedBudgetNode } from '@/hooks/useHierarchy';
import { colors } from '@/lib/theme';
import { useLab } from '@/contexts/LabContext';
import { scaleLinear } from 'd3-scale';
import { useChartReady } from '@/hooks/useChartReady';
import { useEffect } from 'react';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import { fmtShort } from '@/utils/number';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import ChartWrapper from '@/components/ChartWrapper';
import dynamic from 'next/dynamic';
import { LazyNivoChartProps } from '@/components/LazyNivoChart';

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

// Function to transform our tree data into the format Nivo expects, with depth limiting
const transformDataForNivo = (node: ProcessedBudgetNode, year: number, currentDepth: number, maxDepth: number): any => {
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
    children: node.children.map(child => transformDataForNivo(child, year, currentDepth + 1, maxDepth)),
  };
};

export default function Sunburst({ data, isParentReady = true }: { data: any, isParentReady?: boolean }) { // Accept data prop
  const { year, selectedNodeId, setSelectedNodeId, highlightedNodeIds } = useUi();
  const { scenario } = useLab();
  const { root, isLoading } = useHierarchy(); // Keep root for full data access
  const isChartReady = useChartReady([data, year]); // Check useChartReady for data/hydration checks

  const { deltas } = scenario;

  // Color scales for impact overlay
  const greenScale = scaleLinear<string>().domain([0, 0.2]).range(["#A5D6A7", "#388E3C"]);
  const redScale = scaleLinear<string>().domain([-0.2, 0]).range(["#B71C1C", "#FFCDD2"]);

  // Log component initialization and data state
  useEffect(() => {
    logChartStart('Sunburst', { year, selectedNodeId, highlightedNodeIds: highlightedNodeIds.length });
    chartLogger.logEnvironment('Sunburst');
  }, []);

  useEffect(() => {
    logDataLoad('Sunburst', {
      hasRoot: !!root, // Still log root status
      hasData: !!data, // Log data prop status
      isLoading,
      year,
      isChartReady,
      isParentReady,
      dataChildren: data ? data.children?.length : 0
    });
  }, [root, data, isLoading, year, isChartReady, isParentReady]);

  useEffect(() => {
    logChartReady('Sunburst', {
      hasRoot: !!root,
      hasData: !!data,
      isLoading,
      isChartReady,
      isParentReady,
      canRender: !!data && isChartReady && isParentReady
    });
  }, [root, data, isLoading, isChartReady, isParentReady]);

  // Only proceed if chart is ready (data loaded and hydrated) AND parent is ready
  if (!isChartReady || !isParentReady || !data) { // Use data prop here
    chartLogger.log('Sunburst', 'RENDER_BLOCKED', {
      isLoading,
      hasData: !!data,
      isChartReady,
      isParentReady,
      reason: isLoading ? 'loading' : !data ? 'no-data' : !isParentReady ? 'parent-not-ready' : 'not-ready'
    });
    return <div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />;
  }

  const nivoData = data; // Use the data prop directly

  const isHighlighted = (id: string) => highlightedNodeIds.includes(id);

  const chartProps = {
    data: nivoData,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    id: "id",
    value: "value",
    cornerRadius: 3,
    borderWidth: 2,
    borderColor: (d: any) => {
      const delta = deltas[d.id as string] || 0;
      if (delta > 0) return '#4CAF50';
      if (delta < 0) return '#D32F2F';
      if (isHighlighted(d.id as string)) return colors.platform.cyan;
      return colors.platform.background;
    },
    colors: (d: any) => {
      const delta = deltas[d.id as string] || 0;
      if (isHighlighted(d.id as string)) return colors.platform.cyan;
      if (delta < 0) return redScale(delta);
      if (delta > 0) return greenScale(delta);
      
      const defaultColors = [colors.platform.accent, colors.platform.fuchsia];
      return defaultColors[d.depth % defaultColors.length];
    },
    childColor: { from: 'color', modifiers: [['brighter', 0.4]] },
    enableArcLabels: true,
    arcLabel: "data.name",
    arcLabelsSkipAngle: 12,
    arcLabelsTextColor: colors.platform.text,
    motionConfig: "gentle",
    transitionMode: "pushIn",
    onClick: (node: any) => setSelectedNodeId(node.id as string),
    tooltip: (node: any) => {
      const name = node.data.name || node.id || 'Unknown';
      const value = node.value || 0;
      const parentValue = node.parent?.value;
      let percentageOfParent = 'N/A';

      if (node.depth === 0) {
        percentageOfParent = '100.0';
      } else if (parentValue && parentValue > 0) {
        percentageOfParent = ((value / parentValue) * 100).toFixed(1);
      }
    
      return (
        <div
          style={{
            background: colors.platform.contrast,
            color: colors.platform.text,
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <strong>{name}</strong>
          <br />
          Value: {fmtShort(value)}
          <br />
          {percentageOfParent}% of parent
        </div>
      );
    },
    theme: {
      labels: { text: { fill: colors.platform.text, fontSize: 12 } },
    }
  };

  chartLogger.log('Sunburst', 'RENDERING_LAZY_NIVO_CHART', {
    hasNivoData: !!nivoData,
    nivoDataChildren: nivoData?.children?.length || 0
  });

  return (
    <ChartErrorBoundary>
      <ChartWrapper
        fallback={<div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />}
        className="w-full h-full"
      >
        <LazyNivoChart
          chartType="sunburst"
          chartProps={chartProps}
          fallback={<div className="w-full h-full rounded-full bg-platform-contrast animate-pulse" />}
          className="w-full h-full"
          isParentReady={isChartReady && isParentReady}
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}