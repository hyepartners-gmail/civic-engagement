"use client";
import { useMemo, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { useTaxPolicyData } from '@/hooks/useTaxPolicyData';
import { colors } from '@/lib/theme';
import { fmtPct } from '@/utils/number';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import dynamic from 'next/dynamic'; // Import dynamic
import { LazyNivoChartProps } from '@/components/LazyNivoChart'; // Import the interface

// Dynamically import LazyNivoChart with explicit props typing
const LazyNivoChart = dynamic<LazyNivoChartProps>(() => import('@/components/LazyNivoChart'), { ssr: false });

export default function HistoricalRatesChart() {
  const { data: taxPolicy, isLoading } = useTaxPolicyData();
  const isChartReady = useChartReady([taxPolicy]);

  const { rateData, allDataByYear } = useMemo(() => {
    if (!taxPolicy?.history) return { rateData: [], allDataByYear: new Map() };

    const lowestRateSeries: { x: number; y: number | null }[] = [];
    const highestRateSeries: { x: number; y: number | null }[] = [];

    // Sort by year to ensure the line chart draws correctly
    const sortedHistory = Object.entries(taxPolicy.history).sort(([yearA], [yearB]) => Number(yearA) - Number(yearB));

    sortedHistory.forEach(([yearStr, policy]) => {
      const year = Number(yearStr);
      
      // Filter out nulls for rates
      if (policy.lowestBracket?.rate !== null && policy.lowestBracket?.rate !== undefined) {
        lowestRateSeries.push({ x: year, y: policy.lowestBracket.rate });
      }
      if (policy.highestBracket?.rate !== null && policy.highestBracket?.rate !== undefined) {
        highestRateSeries.push({ x: year, y: policy.highestBracket.rate });
      }
    });

    const rateData = [
      { id: 'Highest Rate', data: highestRateSeries },
      { id: 'Lowest Rate', data: lowestRateSeries },
    ];

    // Create a map for the tooltip
    const dataMap = new Map<number, any>();
    rateData.forEach(series => {
      series.data.forEach(point => {
        if (point.y !== null) {
          if (!dataMap.has(point.x)) dataMap.set(point.x, { year: point.x });
          dataMap.get(point.x)![series.id] = point.y;
        }
      });
    });

    return { rateData, allDataByYear: dataMap };
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
            data: rateData,
            margin: { top: 20, right: 20, bottom: 50, left: 60 },
            xScale: { type: 'linear' as const, min: 'auto' as const, max: 'auto' as const },
            yScale: { type: 'linear' as const, min: 0, max: 1 as const },
            yFormat: " >-.1%",
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
              legend: 'Marginal Tax Rate',
              legendOffset: -50,
              legendPosition: 'middle',
              format: fmtPct,
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            },
            colors: [colors.platform.accent, colors.platform.cyan],
            lineWidth: 3,
            pointSize: 8,
            pointBorderWidth: 2,
            pointBorderColor: { from: 'serieColor' },
            pointColor: { theme: 'background' },
            useMesh: true,
            legends: [
              {
                anchor: 'top-right',
                direction: 'column',
                justify: false,
                translateX: 0,
                translateY: 0,
                itemsSpacing: 2,
                itemDirection: 'left-to-right',
                itemWidth: 120,
                itemHeight: 20,
                itemOpacity: 0.85,
                symbolSize: 12,
                symbolShape: 'circle',
                itemTextColor: colors.platform.text, // Set legend item text color
              },
            ],
            tooltip: ({ point }: any) => {
              const yearData = allDataByYear.get(point.data.x as number);
              if (!yearData) return null;
              return (
                <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
                  <strong className="font-bold" style={{ color: colors.platform.text }}>FY {yearData.year}</strong>
                  {Object.entries(yearData).map(([key, value]) => {
                    if (key === 'year') return null;
                    return (
                      <div key={key} className="flex justify-between gap-4" style={{ color: colors.platform.text }}>
                        <span>{key}:</span>
                        <span className="font-mono">{fmtPct(value as number)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            },
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