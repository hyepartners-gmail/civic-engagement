import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';

interface EmissionsChartProps {
  data: {
    co2: {
      id: string;
      data: { x: number; y: number | null }[];
    };
    anomaly: {
      id: string;
      data: { x: number; y: number | null }[];
    };
  };
  co2Unit: string;
}

export default function EmissionsChart({ data, co2Unit }: EmissionsChartProps) {
  // Filter out null values
  const co2Data = data.co2.data.filter(d => d.y !== null);
  const anomalyData = data.anomaly.data.filter(d => d.y !== null);

  // Combine data for the chart
  const chartData = [
    {
      id: data.co2.id,
      data: co2Data,
      color: colors.semantic.info
    },
    {
      id: data.anomaly.id,
      data: anomalyData,
      color: colors.semantic.error
    }
  ];

  return (
    <div className="h-80">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 20, right: 100, bottom: 60, left: 60 }}
        xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Year',
          legendOffset: 40,
          legendPosition: 'middle'
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: co2Unit,
          legendOffset: -50,
          legendPosition: 'middle'
        }}
        colors={{ scheme: 'nivo' }}
        pointSize={6}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
      />
    </div>
  );
}