"use client";
import { useMemo, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { useTaxPolicyData } from '@/hooks/useTaxPolicyData';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import dynamic from 'next/dynamic'; // Import dynamic
import { LazyNivoChartProps } from '@/components/LazyNivoChart'; // Import the interface

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

export default function TopBracketThresholdChart() {
  const { data: taxPolicy, isLoading } = useTaxPolicyData();
  const isChartReady = useChartReady([taxPolicy]);

  const chartData = useMemo(() => {
    if (!taxPolicy?.history) return [];

    const thresholdSeries: { x: number; y: number | null }[] = [];

    // Sort by year to ensure the line chart draws correctly
    const sortedHistory = Object.entries(taxPolicy.history).sort(([yearA], [yearB]) => Number(yearA) - Number(yearB));

    sortedHistory.forEach(([yearStr, policy]) => {
      const year = Number(yearStr);
      
      // Corrected: Use thresholdMarriedJoint_over
      const thresholdValue = policy.highestBracket?.thresholdMarriedJoint_over ?? null; 
      // Filter out nulls and ensure positive for log scale
      if (thresholdValue !== null && thresholdValue > 0) {
        thresholdSeries.push({ x: year, y: thresholdValue });
      }
    });

    return [{ id: 'Top Bracket Threshold', data: thresholdSeries }];
  }, [taxPolicy]);

  if (isLoading || !isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

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
            margin: { top: 20, right: 20, bottom: 50, left: 80 },
            xScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
            // Set min to 1 for log scale
            yScale: { type: 'linear' as const, min: 1 as const, max: 'auto' as const },
            yFormat: (v: number) => `$${fmtShort(v)}`,
            axisTop: null,
            axisRight: null,
            axisBottom: {
              legend: 'Year',
              legendOffset: 36,
              legendPosition: 'middle',
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            },
            axisLeft: {
              legend: 'Income Threshold ($)',
              legendOffset: -70,
              legendPosition: 'middle',
              format: (v: number) => `$${fmtShort(v)}`,
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            },
            colors: [colors.platform.accent],
            lineWidth: 3,
            pointSize: 6,
            pointColor: { theme: 'background' },
            pointBorderWidth: 2,
            pointBorderColor: { from: 'serieColor' },
            useMesh: true,
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
            },
          }}
          isParentReady={isChartReady} // Pass parent's readiness
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}