'use client';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import dynamic from 'next/dynamic';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';

// Dynamically import nivo components to ensure they're only loaded on the client side
const ResponsiveLineChart = dynamic(
  () => import('@nivo/line').then(mod => mod.ResponsiveLine),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface RealWagePanelProps {
  series: { x: Date; y: number | null }[];
}

export default function RealWagePanel({ series }: RealWagePanelProps) {
  const isChartReady = useChartReady([series]);

  // Filter out null values and ensure valid data points
  const validSeriesData = series.filter(d => d.y !== null && d.x instanceof Date && !isNaN(d.x.getTime())) as { x: Date; y: number }[];

  if (!isChartReady || validSeriesData.length === 0) { // Check validSeriesData length
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const chartData = [{ id: 'Real Wages', data: validSeriesData }];

  return (
    <ChartErrorBoundary>
      <ChartWrapper 
        fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
        className="h-full w-full"
      >
        <ResponsiveLineChart
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 20, left: 40 }}
          xScale={{ type: 'time' as const, useUTC: false }}
          yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
          axisLeft={{ format: d => `$${d.toFixed(2)}` }}
          axisBottom={{ format: '%Y', tickValues: 'every 20 years' }}
          enableGridX={false}
          colors={[colors.platform.cyan]}
          lineWidth={2}
          enablePoints={false}
          useMesh={true}
          isInteractive={false}
          theme={{
            axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } } },
            grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
            tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text } },
          }}
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}