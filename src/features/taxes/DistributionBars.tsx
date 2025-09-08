"use client";
import { ResponsiveBar } from '@nivo/bar';
import { colors } from '@/lib/theme';
import { fmtShort } from '@/utils/number';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';

interface DistributionBarsProps {
  data: { bracket: { min: number; max: number | null }; delta: number }[];
}

export default function DistributionBars({ data }: DistributionBarsProps) {
  const isChartReady = useChartReady([data]);

  if (!isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  const formatBracketLabel = (bracket: { min: number; max: number | null }): string => {
    const formatNum = (n: number) => {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
      if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
      return `$${n.toFixed(0)}`;
    };
    const minStr = formatNum(bracket.min);
    if (bracket.max) {
      const maxStr = formatNum(bracket.max);
      return `${minStr} - ${maxStr}`;
    }
    return `${minStr}+`;
  };

  const chartData = data.map(d => ({
    id: formatBracketLabel(d.bracket),
    value: d.delta,
  }));

  return (
    <ChartWrapper 
      fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
      className="h-full w-full"
    >
      <ResponsiveBar
        data={chartData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 10, right: 20, bottom: 80, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' as const, min: 'auto' as const, max: 'auto' as const }}
        indexScale={{ type: 'band' as const, round: true }}
        colors={({ value }) => (value && value > 0 ? colors.platform.accent : colors.platform.fuchsia)}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Income Group',
          legendPosition: 'middle',
          legendOffset: 70,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Change in Tax Revenue',
          legendPosition: 'middle',
          legendOffset: -50,
          format: v => fmtShort(v),
        }}
        enableLabel={true} // Enable labels on bars
        label={d => fmtShort(d.value as number)} // Format label value
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={colors.platform.text} // Set label text color to white
        animate={true}
        motionConfig="gentle"
        tooltip={({ id, value, color }) => (
          <div
            style={{
              background: colors.platform.contrast,
              color: colors.platform.text,
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: color,
                  marginRight: '8px',
                  borderRadius: '2px',
                }}
              />
              <strong style={{ color: colors.platform.text }}>{id}</strong>
            </div>
            <div style={{ color: colors.platform.text }}>
              Tax Change: <strong>{fmtShort(value as number)}</strong>
            </div>
            <div style={{ fontSize: '10px', color: colors.platform.text + '80', marginTop: '4px' }}>
              {(value as number) > 0 ? 'Tax increase' : 'Tax decrease'}
            </div>
          </div>
        )}
        theme={{
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
        }}
        />
    </ChartWrapper>
  );
}