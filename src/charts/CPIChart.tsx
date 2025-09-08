"use client";
import { useMemo, useEffect } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { colors } from '@/lib/theme';
import LazyNivoChart from '@/components/LazyNivoChart';
import { useChartReady } from '@/hooks/useChartReady';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import { fmtShort } from '@/utils/number';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import ChartWrapper from '@/components/ChartWrapper'; // Import ChartWrapper

// Define CpiDataItem interface directly here
interface CpiDataItem {
  year: number;
  cpi: number;
}

export default function CPIChart() {
  const { cpiSeries } = useBudgetData(); // cpiSeries is MacroSeries
  const isChartReady = useChartReady([cpiSeries]);

  // Log component initialization
  useEffect(() => {
    logChartStart('CPIChart', {});
    chartLogger.logEnvironment('CPIChart');
  }, []);

  // Log data state changes
  useEffect(() => {
    logDataLoad('CPIChart', {
      hasCpiData: !!cpiSeries,
      dataPoints: cpiSeries?.cpi ? Object.keys(cpiSeries.cpi).length : 0, // Corrected access
      isChartReady
    });
  }, [cpiSeries, isChartReady]);

  // Log readiness state
  useEffect(() => {
    logChartReady('CPIChart', {
      hasCpiData: !!cpiSeries,
      isChartReady,
      canRender: !!cpiSeries && isChartReady
    });
  }, [cpiSeries, isChartReady]);

  const chartSeries = useMemo(() => {
    if (!cpiSeries || !cpiSeries.cpi) return [];

    const dataPoints = Object.entries(cpiSeries.cpi)
      .map(([year, cpi]) => ({
        x: Number(year),
        y: cpi
      }))
      .sort((a, b) => a.x - b.x); // Ensure data is sorted by year

    const series = {
      id: 'Consumer Price Index',
      data: dataPoints
    };

    console.log('CPIChart: Final chartSeries data:', [series]); // Added logging

    return [series];
  }, [cpiSeries]);

  const dataYearRange = useMemo(() => {
    if (!cpiSeries || !cpiSeries.cpi || Object.keys(cpiSeries.cpi).length === 0) {
      return { minYear: 1913, maxYear: 2025 };
    }
    const years = Object.keys(cpiSeries.cpi).map(Number);
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years)
    };
  }, [cpiSeries]);

  if (!isChartReady) {
    chartLogger.log('CPIChart', 'RENDER_BLOCKED', {
      hasCpiData: !!cpiSeries,
      isChartReady,
      reason: !cpiSeries ? 'no-data' : 'not-ready'
    });
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  // --- NEW CHECK HERE ---
  if (chartSeries.length === 0 || chartSeries[0].data.length === 0) {
    chartLogger.log('CPIChart', 'NO_DATA_TO_RENDER', { hasCpiSeries: !!cpiSeries });
    return (
      <ChartErrorBoundary>
        <ChartWrapper
          fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
          className="h-full w-full flex items-center justify-center text-platform-text/70"
        >
          No CPI data available.
        </ChartWrapper>
      </ChartErrorBoundary>
    );
  }
  // --- END NEW CHECK ---

  chartLogger.log('CPIChart', 'PREPARING_RENDER', {
    seriesLength: chartSeries.length,
    dataPoints: chartSeries[0]?.data?.length || 0
  });

  // Prepare chart props for LazyNivoChart - matching TimelineStacked style
  const chartProps = {
    data: chartSeries,
    margin: { top: 20, right: 110, bottom: 50, left: 60 },
    xScale: { type: 'linear' as const, min: 1910 as const, max: 2030 as const },
    yScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
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
      legend: 'Consumer Price Index', 
      legendOffset: -50, 
      legendPosition: 'middle',
      format: (value: any) => fmtShort(value)
    },
    colors: [colors.platform.accent], // Use primary accent color
    lineWidth: 3,
    enablePoints: true,
    pointSize: 4,
    pointBorderWidth: 2,
    pointBorderColor: { from: 'serieColor' },
    pointColor: { theme: 'background' },
    enableArea: true,
    areaOpacity: 0.3,
    enableSlices: 'x',
    legends: [{ 
      anchor: 'bottom-right', 
      direction: 'column', 
      itemsSpacing: 0, 
      itemDirection: 'left-to-right', 
      itemWidth: 80, 
      itemHeight: 20, 
      itemOpacity: 0.75, 
      symbolSize: 12, 
      symbolShape: 'circle' 
    }],
    sliceTooltip: ({ slice }: any) => {
      const point = slice.points[0];
      return (
        <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
          <div className="font-bold mb-1" style={{ color: colors.platform.text }}>
            {point.data.x}
          </div>
          <div className="flex items-center justify-between gap-4" style={{ color: colors.platform.text }}>
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: point.serieColor }} 
              />
              <span className="flex-1" style={{ color: colors.platform.text }}>
                CPI
              </span>
            </div>
            <span className="font-mono" style={{ color: colors.platform.text }}>
              {point.data.yFormatted}
            </span>
          </div>
        </div>
      );
    },
    theme: {
      axis: { 
        ticks: { 
          text: { 
            fill: colors.platform.text, 
            fontSize: 10 
          } 
        }, 
        legend: { 
          text: { 
            fill: colors.platform.text, 
            fontSize: 12 
          } 
        }, 
      },
      grid: { 
        line: { 
          stroke: colors.platform.contrast, 
          strokeWidth: 1 
        } 
      },
      tooltip: { 
        container: { 
          background: colors.platform.contrast, 
          color: colors.platform.text, 
          fontSize: '12px' 
        } 
      },
      legends: { 
        text: { 
          fill: colors.platform.text 
        } 
      },
    }
  };

  return (
    <ChartErrorBoundary>
      <ChartWrapper
        fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
        className="h-full w-full"
      >
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