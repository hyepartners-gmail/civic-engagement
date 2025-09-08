"use client";
import { useMemo, useEffect } from 'react';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useUi } from '@/contexts/UiContext';
import { colors } from '@/lib/theme';
import LazyNivoChart from '@/components/LazyNivoChart';
import { useChartReady } from '@/hooks/useChartReady';
import { chartLogger, logChartStart, logDataLoad, logChartReady } from '@/utils/chartLogger';
import { fmtShort, fmtPct } from '@/utils/number';
import ChartErrorBoundary from '@/components/charts/ChartErrorBoundary'; // Import ChartErrorBoundary
import ChartWrapper from '@/components/ChartWrapper'; // Import ChartWrapper

export function DeficitBarChartComponent() {
  const { mode } = useUi();
  const { rollup, macro } = useBudgetData();
  const isChartReady = useChartReady([rollup, macro]);

  // Log component initialization
  useEffect(() => {
    logChartStart('DeficitBarChart', { mode });
    chartLogger.logEnvironment('DeficitBarChart');
  }, []);

  // Log data state changes
  useEffect(() => {
    logDataLoad('DeficitBarChart', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      isChartReady,
      mode
    });
  }, [rollup, macro, isChartReady, mode]);

  // Log readiness state
  useEffect(() => {
    logChartReady('DeficitBarChart', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      isChartReady,
      canRender: !!rollup && !!macro && isChartReady
    });
  }, [rollup, macro, isChartReady]);

  const deficitData = useMemo(() => {
    if (!rollup || !macro) return [];

    const years = Object.keys(rollup.years).map(Number).filter(year => year <= 2024).sort((a, b) => a - b);
    const data: any[] = [];

    years.forEach(year => {
      const yearData = rollup.years[year];
      if (yearData && year >= 1962) { // Start from 1962
        let deficit = yearData.deficit || 0;

        // Convert to real dollars or %GDP if needed
        if (mode === 'real') {
          const cpi = macro.cpi[year] || 1;
          const baseCPI = macro.cpi[2024] || 1; // Use 2024 as base year
          const adjustment = baseCPI / cpi;
          deficit = deficit * adjustment;
        } else if (mode === '%GDP') {
          const gdp = macro.gdp[year] || 1;
          deficit = deficit / gdp;
        }

        data.push({
          year: year.toString(),
          Deficit: deficit
        });
      }
    });

    // Find min and max for better scaling
    const deficitValues = data.map(d => d.Deficit);
    const minDeficit = Math.min(...deficitValues);
    const maxDeficit = Math.max(...deficitValues);
    
    console.log('DeficitBarChart: Deficit data points:', data.length); // Added logging
    console.log('DeficitBarChart: Deficit range:', { min: minDeficit, max: maxDeficit }); // Added logging
    console.log('DeficitBarChart: Sample early data (1962-1966):', data.slice(0, 5)); // Added logging
    console.log('DeficitBarChart: Sample recent data (2020-2024):', data.slice(-5)); // Added logging

    return data;
  }, [rollup, macro, mode]);

  const dataYearRange = useMemo(() => {
    if (!rollup || !rollup.years) return { minYear: 1962, maxYear: 2024 };
    const years = Object.keys(rollup.years).map(Number).filter(year => year <= 2024 && year >= 1962);
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years)
    };
  }, [rollup]);

  console.log('DeficitBarChart: Received rollup:', !!rollup, 'macro:', !!macro, 'isChartReady:', isChartReady); // Added logging

  if (!isChartReady) {
    chartLogger.log('DeficitBarChart', 'RENDER_BLOCKED', {
      hasRollup: !!rollup,
      hasMacro: !!macro,
      isChartReady,
      reason: !rollup ? 'no-rollup' : !macro ? 'no-macro' : 'not-ready'
    });
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  chartLogger.log('DeficitBarChart', 'PREPARING_RENDER', {
    dataPointsCount: deficitData.length
  });

  // Prepare chart props for LazyNivoChart
  const chartProps = {
    data: deficitData,
    keys: ['Deficit'],
    indexBy: 'year',
    margin: { top: 20, right: 110, bottom: 50, left: 60 },
    padding: 0.02, // Very thin padding so all 68 bars fit and are visible
    valueScale: { type: 'linear' as const }, // Let Nivo auto-scale to show all values
    indexScale: { type: 'band' as const, round: true },
    colors: [colors.platform.fuchsia], // Only deficit in fuchsia
    axisTop: null,
    axisRight: null,
    axisBottom: { 
      tickSize: 5, 
      tickPadding: 5, 
      tickRotation: -45, // Rotate labels so they fit better
      legend: '', 
      legendOffset: 0, 
      legendPosition: 'middle',
      tickValues: 'every 5 years' // Show fewer year labels so they don't overlap
    },
    axisLeft: { 
      tickSize: 5, 
      tickPadding: 5, 
      tickRotation: 0, 
      legend: `Deficit (${mode})`, 
      legendOffset: -50, 
      legendPosition: 'middle',
      format: (value: number) => mode === '%GDP' ? fmtPct(value) : fmtShort(value),
    },
    tooltip: ({ indexValue, value, color }: any) => (
      <div className="bg-platform-contrast p-2 rounded text-xs shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          <div>
            <div>FY {indexValue}</div>
            <strong>{mode === '%GDP' ? fmtPct(value) : fmtShort(value)}</strong>
          </div>
        </div>
      </div>
    ),
    enableLabel: false,
    legends: [{ 
      dataFrom: 'keys',
      anchor: 'bottom-right', 
      direction: 'column', 
      justify: false, 
      translateX: 100, 
      translateY: 0, 
      itemsSpacing: 2, 
      itemWidth: 80, 
      itemHeight: 20, 
      itemDirection: 'left-to-right',
      itemOpacity: 0.85, 
      symbolSize: 12
    }],
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
          chartType="bar"
          chartProps={chartProps}
          fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
          className="h-full w-full"
          isParentReady={isChartReady} // Pass parent's readiness
        />
      </ChartWrapper>
    </ChartErrorBoundary>
  );
}