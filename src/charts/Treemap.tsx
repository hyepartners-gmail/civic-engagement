"use client";
import { ResponsiveTreeMap } from '@nivo/treemap';
import { useUi } from '@/contexts/UiContext';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { useEffect } from 'react';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import dynamic from 'next/dynamic';
import { LazyNivoChartProps } from '@/components/LazyNivoChart';

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

export default function Treemap({ data, highlightedNodeIds = [], isParentReady = true }: { data: any, highlightedNodeIds?: string[], isParentReady?: boolean }) {
  const { setSelectedNodeId } = useUi();
  const isChartReady = useChartReady([data]); // Check useChartReady for data/hydration checks

  // Log component initialization
  useEffect(() => {
    logChartStart('Treemap', { hasData: !!data, highlightedNodeIds: highlightedNodeIds.length });
    chartLogger.logEnvironment('Treemap');
  }, []);

  useEffect(() => {
    logDataLoad('Treemap', {
      hasData: !!data,
      isChartReady,
      isParentReady,
      dataChildren: data ? data.children?.length : 0
    });
  }, [data, isChartReady, isParentReady]);

  useEffect(() => {
    logChartReady('Treemap', {
      hasData: !!data,
      isChartReady,
      isParentReady,
      canRender: !!data && isChartReady && isParentReady
    });
  }, [data, isChartReady, isParentReady]);

  // Only proceed if chart is ready (data loaded and hydrated) AND parent is ready
  if (!isChartReady || !isParentReady || !data || !data.children || data.children.length === 0) {
    chartLogger.log('Treemap', 'RENDER_BLOCKED', {
      hasData: !!data,
      isChartReady,
      isParentReady,
      reason: !data ? 'no-data' : !data.children ? 'no-children' : !isParentReady ? 'parent-not-ready' : 'not-ready'
    });
    return (
      <ChartErrorBoundary>
        <div className="w-full h-full flex items-center justify-center text-platform-text/70">No data to display.</div>
      </ChartErrorBoundary>
    );
  }

  const chartProps = {
    data: data,
    identity: "id",
    value: "value",
    valueFormat: (v: number) => fmtShort(v),
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    tile: "squarify" as const,
    
    labelSkipSize: 24,
    labelTextColor: { from: 'color', modifiers: [['darker', 3]] },
    parentLabelPosition: "top" as const,
    parentLabelPadding: 10,
    parentLabelTextColor: { from: 'color', modifiers: [['brighter', 1.5]] },
    parentLabelSize: 14,

    innerPadding: 3,
    outerPadding: 5,

    colors: { scheme: 'nivo' },
    
    borderWidth: 1, 
    borderColor: (d: any) => {
      if (highlightedNodeIds.includes(d.id as string)) return colors.platform.cyan;
      return 'inherit:darker(0.3)';
    },

    onClick: (node: any) => setSelectedNodeId(node.id as string),
    
    tooltip: (node: any) => {
      const name = node?.name || node?.id || 'Unknown';
      const value = node?.value || 0;
      const parentValue = node?.parent?.value;
      let percentageOfParent = 'N/A';

      if (node?.depth === 0) {
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
      labels: {
        text: {
          fontSize: 11,
          fontWeight: 600,
        },
      },
    }
  };

  chartLogger.log('Treemap', 'RENDERING_LAZY_NIVO_CHART', {
    hasNivoData: !!data,
    nivoDataChildren: data?.children?.length || 0
  });

  return (
    <ChartErrorBoundary>
      <ChartWrapper 
        fallback={<div className="w-full h-full bg-platform-contrast/30 animate-pulse" />}
        className="w-full h-full"
      >
        <LazyNivoChart
          chartType="treemap"
          chartProps={chartProps}
          fallback={<div className="w-full h-full bg-platform-contrast/30 animate-pulse" />}
          className="w-full h-full"
          isParentReady={isChartReady && isParentReady}
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}