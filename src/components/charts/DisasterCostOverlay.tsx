import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { colors } from '@/lib/theme';

interface DisasterCostOverlayProps {
  data: {
    costs: {
      id: string;
      data: { x: number; y: number | null }[];
    };
    emissions: {
      id: string;
      data: { x: number; y: number | null }[];
    };
  };
  costUnit: string;
  emissionsUnit: string;
}

export default function DisasterCostOverlay({ data, costUnit, emissionsUnit }: DisasterCostOverlayProps) {
  // Filter out null values
  const costsData = data.costs.data.filter(d => d.y !== null);
  const emissionsData = data.emissions.data.filter(d => d.y !== null);

  // Combine data for the chart
  const chartData = [
    {
      id: data.costs.id,
      data: costsData,
      color: colors.semantic.error
    },
    {
      id: data.emissions.id,
      data: emissionsData,
      color: colors.semantic.info
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
          legend: `${costUnit} / ${emissionsUnit}`,
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