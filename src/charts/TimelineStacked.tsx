"use client";
import { useMemo, useEffect } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useUi } from '@/contexts/UiContext';
import { colors } from '@/lib/theme';
import { useChartReady } from '@/hooks/useChartReady';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import { fmtShort, fmtPct } from '@/utils/number'; // Ensure fmtShort and fmtPct are imported
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import ChartWrapper from '@/components/ChartWrapper'; // Import ChartWrapper
import dynamic from 'next/dynamic'; // Import dynamic
import { selectOutlayComponentsSeries } from '@/selectors/budgetSelectors'; // Import the missing function

// Dynamically import LazyNivoChart
const LazyNivoChart = dynamic(() => import('@/components/LazyNivoChart'), { ssr: false });

// We'll handle EventMarkers inside the chart component since it needs access to chart internals

export function TimelineStackedChart() {
  const { mode } = useUi();
  const { rollup, macro, events } = useBudgetData();
  const isChartReady = useChartReady([rollup, macro]);

  // Log component initialization
  useEffect(() => {
    logChartStart('TimelineStacked', { mode });
    chartLogger.logEnvironment('TimelineStacked');
  }, []);

  // Log data state changes
  useEffect(() => {
    logDataLoad('TimelineStacked', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      hasEvents: !!events,
      eventsCount: events?.length || 0,
      isChartReady,
      mode
    });
  }, [rollup, macro, events, isChartReady, mode]);

  // Log readiness state
  useEffect(() => {
    logChartReady('TimelineStacked', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      isChartReady,
      canRender: !!rollup && !!macro && isChartReady
    });
  }, [rollup, macro, isChartReady]);

  const series = useMemo(() => {
    if (!rollup || !macro) return [];
    const [mandatory, discretionary, netInterest, deficit] = selectOutlayComponentsSeries(rollup, macro, mode);
    return [mandatory, discretionary, netInterest, deficit];
  }, [rollup, macro, mode]);

  const dataYearRange = useMemo(() => {
    if (!rollup || !rollup.years) return { minYear: 1962, maxYear: 2024 };
    const years = Object.keys(rollup.years).map(Number).filter(year => year <= 2024);
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years)
    };
  }, [rollup]);

  console.log('TimelineStacked: Received rollup:', !!rollup, 'macro:', !!macro, 'isChartReady:', isChartReady); // Added logging
  console.log('TimelineStacked: Final chartSeries data:', series); // Added logging

  if (!isChartReady) {
    chartLogger.log('TimelineStacked', 'RENDER_BLOCKED', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      isChartReady,
      reason: !rollup ? 'no-rollup' : !macro ? 'no-macro' : 'not-ready'
    });
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const chartSeries = series.slice(0, 3);
  const deficitSeries = series.length > 3 ? [series[3]] : [];

  chartLogger.log('TimelineStacked', 'PREPARING_RENDER', {
    seriesLength: series.length,
    chartSeriesLength: chartSeries.length,
    deficitSeriesLength: deficitSeries.length,
    hasEvents: !!events
  });

  // Prepare chart props for LazyNivoChart
  const chartProps = {
    data: chartSeries,
    margin: { top: 20, right: 110, bottom: 50, left: 60 },
    xScale: { type: 'linear' as const, min: dataYearRange.minYear, max: dataYearRange.maxYear },
    yScale: { type: 'linear' as const, min: 0 as const, max: 'auto' as const, stacked: true },
    curve: "monotoneX",
    axisTop: null,
    axisRight: null,
    axisBottom: { 
      tickSize: 5, 
      tickPadding: 5, 
      tickRotation: 0, 
      legend: '', 
      legendOffset: 0, 
      legendPosition: 'middle' 
    },
    axisLeft: { 
      tickSize: 5, 
      tickPadding: 5, 
      tickRotation: 0, 
      legend: `Spending (${mode})`, 
      legendOffset: -50, 
      legendPosition: 'middle',
      format: (value: number) => mode === '%GDP' ? fmtPct(value) : fmtShort(value),
    },
    colors: [colors.platform.cyan, colors.platform.fuchsia, colors.platform.contrast],
    lineWidth: 0,
    enablePoints: false,
    enableArea: true,
    areaOpacity: 0.8,
    enableSlices: 'x',
    legends: [{ anchor: 'bottom-right', direction: 'column', justify: false, translateX: 100, translateY: 0, itemsSpacing: 0, itemDirection: 'left-to-right', itemWidth: 80, itemHeight: 20, itemOpacity: 0.75, symbolSize: 12, symbolShape: 'circle' }],
    sliceTooltip: ({ slice }: any) => (
      <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
        <div className="font-bold mb-1">FY {slice.points[0].data.x}</div>
        {slice.points.map((point: any) => (
          <div key={point.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: point.serieColor }} />
              <span className="flex-1">{point.serieId}</span>
            </div>
            <span className="font-mono">{fmtShort(point.data.y as number)}</span>
          </div>
        ))}
      </div>
    ),
    theme: {
      axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, legend: { text: { fill: colors.platform.text, fontSize: 12 } } },
      grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
      tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text, fontSize: '12px' } },
      legends: { text: { fill: colors.platform.text } },
    }
  };

  return (
    <ChartErrorBoundary>
      <ChartWrapper className="h-full w-full">
        <LazyNivoChart
          chartType="line"
          chartProps={chartProps}
          fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
          className="h-full w-full"
          isParentReady={isChartReady} // Pass parent's readiness
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}