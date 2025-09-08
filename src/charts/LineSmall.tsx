"use client";
import { colors } from '@/lib/theme';
import { useChartReady } from '@/hooks/useChartReady';
import { useEffect, useMemo } from 'react';
import { chartLogger, logChartStart, logDataLoad, logChartRender, logChartError } from '@/utils/chartLogger';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';
import ChartWrapper from '@/components/ChartWrapper';
import dynamic from 'next/dynamic';
import { LazyNivoChartProps } from '@/components/LazyNivoChart'; // Import the interface

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

interface LineSmallProps {
  data: { x: number | string; y: number | null }[];
  isParentReady?: boolean; // New prop to signal parent's readiness
}

export default function LineSmall({ data, isParentReady = true }: LineSmallProps) {
  // Memoize the data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => {
    return data?.map(point => ({ ...point })) || [];
  }, [data]);
  
  const isChartReady = useChartReady([memoizedData]); // Keep useChartReady for data/hydration checks

  // Log component initialization
  useEffect(() => {
    logChartStart('LineSmall', { dataLength: memoizedData?.length || 0 });
  }, []);

  // Log data changes
  useEffect(() => {
    logDataLoad('LineSmall', {
      hasData: !!memoizedData,
      dataLength: memoizedData?.length || 0,
      isChartReady,
      isParentReady
    });
  }, [memoizedData, isChartReady, isParentReady]);

  // Only proceed if chart is ready (data loaded and hydrated) AND parent is ready
  if (!isChartReady || !isParentReady) {
    chartLogger.log('LineSmall', 'RENDER_BLOCKED_NOT_READY', { isChartReady, isParentReady });
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  chartLogger.log('LineSmall', 'PREPARING_RENDER', { dataLength: memoizedData.length });

  const chartProps = {
    data: [{ id: 'sparkline', data: memoizedData }],
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    xScale: { type: 'point' as const },
    yScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const, stacked: false, reverse: false },
    axisTop: null,
    axisRight: null,
    axisBottom: null,
    axisLeft: null,
    enableGridX: false,
    enableGridY: false,
    colors: [colors.platform.accent],
    lineWidth: 2,
    enablePoints: false,
    enableArea: true,
    areaOpacity: 0.1,
    useMesh: true,
    isInteractive: false,
    animate: false,
    theme: {
      grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
      tooltip: {
        container: {
          background: colors.platform.contrast,
          color: colors.platform.text,
          fontSize: '12px',
        },
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
          isParentReady={isChartReady && isParentReady}
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}