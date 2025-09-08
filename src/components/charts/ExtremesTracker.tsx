"use client";
import { useBudgetData } from '@/hooks/useBudgetData';
import { useMemo } from 'react';
import { selectTotals } from '@/selectors/budgetSelectors';
import LazyNivoChart from '@/components/LazyNivoChart';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Target, 
  DollarSign, Calendar, Activity, Shield 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

// Chart component for tracking extreme weather events (Story 7).
export default function ExtremesTracker() {
  const { rollup, macro, events } = useBudgetData();

  const extremesData = useMemo(() => {
    if (!rollup || !macro) return { lineData: [], extremes: [] };

    const years = Object.keys(rollup.years)
      .map(Number)
      .sort((a, b) => a - b);

    // Calculate deficit ratios to find extremes
    const deficitRatios = years.map(year => {
      const totals = selectTotals(rollup, macro, year, '%GDP');
      return {
        year,
        deficitRatio: Math.abs(totals.deficit),
        actualDeficit: selectTotals(rollup, macro, year, 'nominal').deficit
      };
    });

    // Sort to find extremes
    const sortedByDeficit = [...deficitRatios].sort((a, b) => b.deficitRatio - a.deficitRatio);
    const highestDeficits = sortedByDeficit.slice(0, 10); // Top 10 deficit years
    
    // Create line data showing deficit over time
    const lineData = [{
      id: 'deficit-trend',
      data: deficitRatios.map(d => ({
        x: d.year,
        y: d.deficitRatio,
        actualValue: d.actualDeficit
      }))
    }];

    return { lineData, extremes: highestDeficits };
  }, [rollup, macro]);

  const chartProps = {
    data: extremesData.lineData,
    margin: { top: 50, right: 110, bottom: 50, left: 70 },
    xScale: { type: 'point' as const },
    yScale: {
      type: 'linear' as const,
      min: 0,
      max: 'auto' as const,
      stacked: false,
      reverse: false
    },
    yFormat: ' >-.1f',
    curve: 'monotoneX',
    axisTop: null,
    axisRight: null,
    axisBottom: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: -45,
      legend: 'Year',
      legendOffset: 36,
      legendPosition: 'middle'
    },
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: 'Deficit as % of GDP',
      legendOffset: -50,
      legendPosition: 'middle'
    },
    pointSize: (point: any) => {
      // Highlight extreme years with larger points
      const isExtreme = extremesData.extremes.some((e: any) => e.year === point.data.x);
      return isExtreme ? 12 : 6;
    },
    pointColor: (point: any) => {
      const isExtreme = extremesData.extremes.some((e: any) => e.year === point.data.x);
      return isExtreme ? colors.platform.fuchsia : colors.platform.accent;
    },
    pointBorderWidth: 2,
    pointBorderColor: { from: 'serieColor' },
    pointLabelYOffset: -12,
    enableArea: true,
    areaOpacity: 0.2,
    colors: [colors.platform.accent],
    tooltip: ({ point }: any) => {
      const isExtreme = extremesData.extremes.some((e: any) => e.year === point.data.x);
      const rank = extremesData.extremes.findIndex((e: any) => e.year === point.data.x) + 1;
      
      return (
        <div className="bg-platform-contrast p-3 rounded text-xs shadow-lg">
          <div className="font-bold mb-1">
            {isExtreme && <span className="text-platform-fuchsia">#{rank} Extreme: </span>}
            Year {point.data.x}
          </div>
          <div>Deficit: {point.data.y.toFixed(1)}% of GDP</div>
          <div className="text-red-400">
            ${Math.abs(point.data.actualValue / 1000000000000).toFixed(2)}T deficit
          </div>
          {isExtreme && (
            <div className="text-platform-fuchsia text-xs mt-1">
              One of the highest deficit years on record
            </div>
          )}
        </div>
      );
    },
    enableGridX: false,
    enableGridY: true,
    theme: {
      grid: {
        line: {
          stroke: colors.platform.contrast,
          strokeWidth: 1,
          strokeOpacity: 0.3
        }
      },
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
        }
      }
    }
  };

  const isChartReady = useChartReady([rollup, macro]);

  if (!rollup || !macro) {
    return (
      <div className="h-64 bg-platform-contrast/30 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-platform-text/70">Loading extremes data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <LazyNivoChart
          chartType="line"
          chartProps={chartProps}
          fallback={
            <div className="h-full w-full bg-platform-contrast/30 animate-pulse flex items-center justify-center">
              <span className="text-platform-text/70">Loading extremes chart...</span>
            </div>
          }
          isParentReady={isChartReady} // Pass parent's readiness
        />
      </div>
      
      {/* Extreme years summary */}
      <div className="bg-platform-contrast/20 p-4 rounded-lg">
        <h4 className="font-semibold mb-2 text-platform-accent">Highest Deficit Years (% of GDP)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {extremesData.extremes.slice(0, 5).map((extreme: any, index: number) => (
            <div key={extreme.year} className="text-center p-2 bg-platform-fuchsia/10 rounded">
              <div className="font-bold text-platform-fuchsia">#{index + 1}</div>
              <div>{extreme.year}</div>
              <div>{extreme.deficitRatio.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}