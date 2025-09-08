'use client';
import { ResponsiveBar } from '@nivo/bar';
import { EmploymentArtifact } from '@/types/employment';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';
import { useEffect } from 'react'; // Import useEffect for logging

interface YearlyNetChangeBarChartProps {
  artifact: EmploymentArtifact;
}

export default function YearlyNetChangeBarChart({ artifact }: YearlyNetChangeBarChartProps) {
  const seriesKey = 'ces.net_job_change';
  const seriesObj = artifact.series[seriesKey] || artifact.series[seriesKey.replace(/\./g, '_')];
  
  const series = seriesObj;
  const isChartReady = useChartReady([series]);

  // --- DEBUG LOGS ---
  useEffect(() => {
    console.log(`[YearlyNetChangeBarChart] Component rendered.`);
    console.log(`[YearlyNetChangeBarChart] isChartReady: ${isChartReady}`);
    console.log(`[YearlyNetChangeBarChart] Raw series for '${seriesKey}':`, series ? `Length ${series.length}, Sample: ${series.slice(0, 5)}` : 'Not found');
    console.log(`[YearlyNetChangeBarChart] Artifact index:`, artifact.index ? `Length ${artifact.index.length}, Sample: ${artifact.index.slice(0, 5).map(r => r.fy)}` : 'Not found');
  }, [isChartReady, series, artifact.index]);
  // --- END DEBUG LOGS ---

  const chartData = series
    .map((value: number | null, i: number) => {
      const indexRow = artifact.index[i];
      if (indexRow && indexRow.period_type === 'fiscal_year' && value !== null) {
        return {
          year: indexRow.fy.toString(),
          value: value
        };
      }
      return null;
    })
    .filter((d: any) => d !== null && d.value !== null);

  // --- DEBUG LOGS ---
  useEffect(() => {
    console.log(`[YearlyNetChangeBarChart] Processed chartData:`, chartData ? `Length ${chartData.length}, Sample: ${chartData.slice(0, 5)}` : 'Empty after processing');
    if (chartData.length === 0) {
      console.warn(`[YearlyNetChangeBarChart] chartData is empty, this will result in no chart being displayed.`);
    }
  }, [chartData]);
  // --- END DEBUG LOGS ---

  if (!isChartReady || !series) {
    console.log(`[YearlyNetChangeBarChart] Not ready to render. isChartReady: ${isChartReady}, series exists: ${!!series}`);
    return (
      <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-platform-text/70">No yearly data available</p>
          <p className="text-xs text-platform-text/50 mt-1">Yearly employment change data not found</p>
        </div>
      </div>
    );
  }

  return (
    <ChartWrapper 
      fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
      className="h-full w-full"
    >
      <ResponsiveBar
        data={chartData as any}
        keys={['value']}
        indexBy="year"
        margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
        padding={0.2}
        valueScale={{ type: 'linear' as const }}
        indexScale={{ type: 'band' as const, round: true }}
        colors={({ value }) => ((value ?? 0) > 0 ? colors.semantic.success : colors.semantic.error)}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: (value) => {
            if (parseInt(value) % 10 === 0) {
              return value;
            }
            return '';
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Net Change (Thousands)',
          legendPosition: 'middle',
          legendOffset: -50,
          format: v => fmtShort(v),
        }}
        enableLabel={false}
        theme={{
          axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, legend: { text: { fill: colors.platform.text, fontSize: 12 } } },
          grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
          tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text, fontSize: '12px' } },
        }}
      />
    </ChartWrapper>
  );
}