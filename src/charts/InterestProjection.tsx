"use client";
import { useMemo, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';
import { Projection } from '@/types';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import dynamic from 'next/dynamic'; // Import dynamic
import { LazyNivoChartProps } from '@/components/LazyNivoChart'; // Import the interface

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

interface InterestProjectionProps {
  projection: Record<'base' | 'low' | 'high', Projection['tenYear']>;
  metric: 'debt' | 'netInterest'; // New prop to select metric
}

export default function InterestProjection({ projection, metric }: InterestProjectionProps) {
  const isChartReady = useChartReady([projection]);

  if (!isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const chartData = Object.entries(projection).map(([id, data]) => ({
    id: id.charAt(0).toUpperCase() + id.slice(1),
    data: data.map(d => ({ x: d.year, y: d[metric] })), // Use the metric prop here
  }));

  const yAxisLegend = metric === 'debt' ? 'Debt ($)' : 'Net Interest ($)';

  return (
    <ChartErrorBoundary>
      <ChartWrapper 
        fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
        className="h-full w-full"
      >
        <LazyNivoChart
          chartType="line"
          chartProps={{
            data: chartData,
            margin: { top: 20, right: 20, bottom: 50, left: 70 },
            xScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
            yScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
            axisLeft: {
              legend: yAxisLegend,
              legendOffset: -60,
              format: (v: number) => fmtShort(v), // Corrected: Explicitly type 'v' as number
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            },
            axisBottom: {
              legend: 'Year',
              legendOffset: 40,
              legendPosition: 'middle',
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            },
            colors: [colors.platform.accent, colors.semantic.success, colors.semantic.error],
            lineWidth: 3,
            pointSize: 8,
            pointBorderWidth: 2,
            pointBorderColor: { from: 'serieColor' },
            pointColor: { theme: 'background' },
            useMesh: true,
            tooltip: ({ point }: any) => (
              <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: point.seriesColor }} />
                  <strong style={{ color: colors.platform.text }}>{point.seriesId}</strong>
                </div>
                <div className="mt-1" style={{ color: colors.platform.text }}>
                  FY {point.data.xFormatted}: <strong>{fmtShort(point.data.y as number)}</strong>
                </div>
              </div>
            ),
            legends: [{
              anchor: 'top-left',
              direction: 'row',
              itemsSpacing: 20,
              itemWidth: 80,
              itemHeight: 20,
              translateY: -20,
              itemTextColor: colors.platform.text, // Set legend item text color
            }],
            theme: {
              axis: {
                ticks: {
                  text: {
                    fill: colors.platform.text, // Set axis tick text color
                    fontSize: 10,
                  },
                },
                legend: {
                  text: {
                    fill: colors.platform.text, // Set axis legend text color
                    fontSize: 12,
                  },
                },
              },
              grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
              tooltip: {
                container: {
                  background: colors.platform.contrast,
                  color: colors.platform.text, // Set tooltip text color
                  fontSize: '12px',
                },
              },
              legends: {
                text: {
                  fill: colors.platform.text, // Set legend text color
                },
              },
            },
          }}
          isParentReady={isChartReady} // Pass parent's readiness
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}