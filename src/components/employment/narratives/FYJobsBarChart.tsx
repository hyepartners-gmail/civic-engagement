'use client';
import { ResponsiveBar } from '@nivo/bar';
import { motion } from 'framer-motion';
import ChartWrapper from '@/components/ChartWrapper';
import { useChartReady } from '@/hooks/useChartReady';

interface ChartData {
  fy: number;
  jobs: number;
  gdpGrowth?: number;
}

interface FYJobsBarChartProps {
  data: ChartData[];
  outliers: number[];
}

const getGdpColor = (gdp: number | undefined) => {
  if (gdp === undefined) return '#999';
  if (gdp <= -2) return '#ef4444'; // red-500
  if (gdp < 0) return '#f87171'; // red-400
  if (gdp < 2) return '#fbbf24'; // amber-400
  if (gdp < 4) return '#a3e635'; // lime-400
  return '#4ade80'; // green-400
};

export default function FYJobsBarChart({ data, outliers }: FYJobsBarChartProps) {
  const isChartReady = useChartReady([data, outliers]);

  // Helper to safely format GDP value which might be a string or number from Nivo
  const formatGdp = (gdp: unknown): string => {
    if (typeof gdp === 'number') {
      return gdp.toFixed(1);
    }
    if (typeof gdp === 'string') {
      const parsed = parseFloat(gdp);
      if (!isNaN(parsed)) {
        return parsed.toFixed(1);
      }
    }
    return 'N/A';
  };

  if (!isChartReady) {
    return <div className="h-full w-full bg-gray-800/30 animate-pulse" />;
  }

  return (
    <ChartWrapper 
      fallback={<div className="h-full w-full bg-gray-800/30 animate-pulse" />}
      className="h-full w-full"
    >
      <ResponsiveBar
      data={data as any}
      keys={['jobs']}
      indexBy="fy"
      margin={{ top: 30, right: 20, bottom: 50, left: 60 }}
      padding={0.3}
      valueScale={{ type: 'linear' as const }}
      indexScale={{ type: 'band' as const, round: true }}
      colors={({ data }) => {
        const gdpValue = data.gdpGrowth;
        let numericGdp: number | undefined;
        if (typeof gdpValue === 'number') {
          numericGdp = gdpValue;
        } else if (typeof gdpValue === 'string') {
          const parsed = parseFloat(gdpValue);
          numericGdp = isNaN(parsed) ? undefined : parsed;
        } else {
          numericGdp = undefined;
        }
        return getGdpColor(numericGdp);
      }}
      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -45,
        legend: 'Fiscal Year',
        legendPosition: 'middle',
        legendOffset: 40,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Net Jobs Created/Lost (Millions)',
        legendPosition: 'middle',
        legendOffset: -50,
      }}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      animate={true}
      motionConfig="gentle"
      ariaLabel="Bar chart showing net jobs created or lost by fiscal year"
      barAriaLabel={e => `Fiscal Year ${e.indexValue}: ${e.formattedValue} million net jobs. GDP growth was ${formatGdp(e.data.gdpGrowth)} percent.`}
      tooltip={({ id, value, indexValue, data }) => (
        <div className="bg-gray-800 text-white p-2 rounded shadow-lg text-sm">
          <strong>FY {indexValue}</strong>
          <div>Jobs: {value.toFixed(2)}M</div>
          <div>GDP Growth: {formatGdp(data.gdpGrowth)}%</div>
        </div>
      )}
      layers={['grid', 'axes', 'bars', 'markers', 'legends', ({ bars }) => (
        <g>
          {bars.map(bar => {
            if (outliers.includes(bar.data.indexValue as number)) {
              return (
                <motion.g
                  key={bar.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <text
                    x={bar.x + bar.width / 2}
                    y={bar.y - 10}
                    textAnchor="middle"
                    alignmentBaseline="central"
                    className="text-xs fill-current text-amber-300 font-bold"
                  >
                    Divergence!
                  </text>
                </motion.g>
              );
            }
            return null;
          })}
        </g>
      )]}
      />
    </ChartWrapper>
  );
}