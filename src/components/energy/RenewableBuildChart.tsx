"use client";
import { ResponsiveStream } from '@nivo/stream';
import { Plant } from '@/lib/energySchema';
import { selectRenewableBuildOverTime } from '@/lib/selectors/energy';
import { getFuelColor } from '@/utils/energy';
import { colors } from '@/lib/theme';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';

interface RenewableBuildChartProps {
  plants: Plant[];
}

export default function RenewableBuildChart({ plants }: RenewableBuildChartProps) {
  const data = selectRenewableBuildOverTime(plants);
  const isChartReady = useChartReady([plants, data]);

  if (data.length === 0) {
    return <div className="text-center text-sm text-platform-text/70">No renewable plant data to display.</div>;
  }

  if (!isChartReady) {
    return <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />;
  }

  return (
    <div className="h-full w-full">
      <h3 className="text-lg font-semibold mb-2">Renewable Capacity Growth</h3>
      <ChartWrapper 
        fallback={<div className="h-full w-full bg-platform-contrast/30 animate-pulse" />}
        className="h-full w-full"
      >
        <ResponsiveStream
        data={data as any}
        keys={data.map(d => d.id)}
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Year',
          legendOffset: 36,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Cumulative Capacity (MW)',
          legendOffset: -50,
        }}
        enableGridX={true}
        colors={({ id }) => getFuelColor(id as string)}
        fillOpacity={0.85}
        borderColor={{ theme: 'background' }}
        defs={[
          { id: 'dots', type: 'patternDots', size: 4, padding: 2, stagger: true },
          { id: 'squares', type: 'patternSquares', size: 4, padding: 2, stagger: true },
        ]}
        fill={[
          { match: { id: 'Hydro' }, id: 'dots' },
          { match: { id: 'Solar' }, id: 'squares' },
        ]}
        dotSize={8}
        dotColor={{ from: 'color' }}
        dotBorderWidth={2}
        dotBorderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
        theme={{
          axis: { ticks: { text: { fill: colors.platform.text, fontSize: 10 } }, legend: { text: { fill: colors.platform.text, fontSize: 12 } } },
          grid: { line: { stroke: colors.platform.contrast, strokeWidth: 1 } },
          tooltip: { container: { background: colors.platform.contrast, color: colors.platform.text, fontSize: '12px' } },
        }}
        />
      </ChartWrapper>
    </div>
  );
}