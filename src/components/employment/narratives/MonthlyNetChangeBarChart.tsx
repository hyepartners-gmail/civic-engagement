'use client';
import { ResponsiveBar } from '@nivo/bar';
import { EmploymentArtifact } from '@/types/employment';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';

interface MonthlyNetChangeBarChartProps {
  artifact: EmploymentArtifact;
}

export default function MonthlyNetChangeBarChart({ artifact }: MonthlyNetChangeBarChartProps) {
  const series = artifact.series['ces.net_job_change'];
  const isChartReady = useChartReady([series]);

  if (!isChartReady || !series) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const chartData = artifact.index
    .map((row, i) => ({
      date: row.date,
      value: series[i],
    }))
    .filter(d => d.value !== null);

  return (
    <ChartWrapper 
      fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
      className="h-full w-full"
    >
      <ResponsiveBar
        data={chartData as any}
        keys={['value']}
        indexBy="date"
        margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
        padding={0.1}
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
            const date = new Date(value);
            if (date.getUTCMonth() === 0 && date.getUTCFullYear() % 10 === 0) {
              return date.getUTCFullYear().toString();
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