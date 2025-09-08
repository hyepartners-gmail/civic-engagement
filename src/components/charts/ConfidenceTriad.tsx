'use client';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import dynamic from 'next/dynamic';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary';

// Dynamically import ResponsiveLine to ensure it's only loaded on the client side
const ResponsiveLine = dynamic(
  () => import('@nivo/line').then(mod => {
    if (!mod || !mod.ResponsiveLine) {
      throw new Error('Failed to load ResponsiveLine component');
    }
    return mod.ResponsiveLine;
  }).catch(error => {
    console.error('Error loading ResponsiveLine:', error);
    // Return a fallback component
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Unable to load line chart component</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);

interface ConfidenceTriadProps {
  data: {
    quits: (number | null)[];
    wages: (number | null)[];
    unemployment: (number | null)[];
    surgeWindows: { start: number; end: number }[];
    index: { date: string }[];
  };
}

export default function ConfidenceTriad({ data }: ConfidenceTriadProps) {
  const isChartReady = useChartReady([data]);

  if (!isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  // Check if we have valid data
  if (!data || !data.quits || !data.wages || !data.unemployment || !data.index) {
    return <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
        <p className="text-xs text-platform-text/50 mt-1">Missing required data</p>
      </div>
    </div>;
  }

  const series = [
    { id: 'Quits Rate', data: (data.quits || []).map((y, i) => ({ x: new Date(data.index[i].date), y })) },
    { id: 'Real Wage Growth (YoY)', data: (data.wages || []).map((y, i) => ({ x: new Date(data.index[i].date), y })) },
    { id: 'Unemployment Rate', data: (data.unemployment || []).map((y, i) => ({ x: new Date(data.index[i].date), y })) },
  ].map(s => ({ ...s, data: s.data.filter(d => d.y !== null) as { x: Date; y: number }[] }));

  // Check if we have any valid data points
  const hasValidData = series.some(s => s.data && s.data.length > 0);
  if (!hasValidData) {
    return <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">No data available</p>
        <p className="text-xs text-platform-text/50 mt-1">No valid data points to display</p>
      </div>
    </div>;
  }

  return (
    <ChartWrapper 
      fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
      className="h-full w-full flex items-stretch"
    >
      <ChartErrorBoundary>
        <ResponsiveLine
          data={series}
          margin={{ top: 20, right: 110, bottom: 70, left: 60 }}
          xScale={{ type: 'time' as const, useUTC: false }}
          yScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
          axisBottom={{ format: '%Y', tickValues: 'every 5 years' }}
          axisLeft={{ legend: 'Value / Rate', legendOffset: -50 }}
          colors={[colors.platform.accent, colors.platform.cyan, colors.semantic.error]}
          lineWidth={2}
          enablePoints={false}
          useMesh={true}
          legends={[{ anchor: 'bottom-right', direction: 'column', justify: false, translateX: 100, translateY: 0, itemsSpacing: 0, itemDirection: 'left-to-right', itemWidth: 80, itemHeight: 20, itemOpacity: 0.75, symbolSize: 12, symbolShape: 'circle' }]}
          theme={{
            axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, legend: { text: { fill: colors.platform.text, fontSize: 12 } } },
            grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
            tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text, fontSize: '12px' } },
            legends: { text: { fill: colors.platform.text } },
          }}
        />
      </ChartErrorBoundary>
    </ChartWrapper>
  );
}